import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { lockedFindOne } from './db';
import { AdjustMaterialStockDto, CreateMaterialItemDto, LogMaterialConsumptionDto, UpdateMaterialItemDto } from './dto';
import { MaterialConsumption, MaterialItem, MaterialStockActivity, ProductionJob } from './entities';
import { AuthService } from './auth.service';

@Injectable()
export class MaterialService {
  constructor(
    @InjectRepository(MaterialItem) private materials: Repository<MaterialItem>,
    @InjectRepository(MaterialStockActivity) private stocks: Repository<MaterialStockActivity>,
    private auth: AuthService,
  ) {}

  async list() {
    const all = await this.materials.find({ order: { name: 'ASC' } });
    return all.map((item) => ({ ...item, lowStock: item.stockQuantity <= item.lowStockThreshold }));
  }

  async one(id: string) {
    const item = await this.materials.findOneBy({ id });
    if (!item) throw new NotFoundException('Material item not found');
    return item;
  }

  async create(dto: CreateMaterialItemDto, email: string) {
    const item = await this.materials.save(this.materials.create(dto));
    await this.auth.audit(email, 'create', 'material_item', item.id, { name: item.name });
    return item;
  }

  async update(id: string, dto: UpdateMaterialItemDto, email: string) {
    const item = await this.one(id);
    const previousStock = item.stockQuantity;
    Object.assign(item, dto);
    const saved = await this.materials.save(item);
    if (dto.stockQuantity !== undefined && dto.stockQuantity !== previousStock) {
      await this.recordStock(saved, previousStock, dto.stockQuantity, 'Material item update', email);
    }
    await this.auth.audit(email, 'update', 'material_item', id, dto);
    return saved;
  }

  async adjust(id: string, dto: AdjustMaterialStockDto, email: string) {
    const item = await this.one(id);
    const previous = item.stockQuantity;
    item.stockQuantity = dto.stockQuantity;
    await this.materials.save(item);
    await this.recordStock(item, previous, dto.stockQuantity, dto.reason, email);
    await this.auth.audit(email, 'adjust_stock', 'material_item', id, dto);
    return item;
  }

  private recordStock(item: MaterialItem, previousQuantity: number, newQuantity: number, reason: string, actorEmail: string) {
    return this.stocks.save(this.stocks.create({ materialItemId: item.id, materialName: item.name, previousQuantity, newQuantity, reason, actorEmail }));
  }

  /**
   * Logged against a specific job, not a daily total, so a quantity mismatch
   * on one job shows up on that job's own record rather than being buried in
   * a period aggregate (see docs/superpowers/specs/2026-10-31-internal-controls-system.md).
   */
  async logConsumption(jobId: string, dto: LogMaterialConsumptionDto, actor: string): Promise<MaterialConsumption> {
    return this.materials.manager.transaction(async (manager) => {
      const item = await lockedFindOne(manager, MaterialItem, { id: dto.materialItemId });
      if (!item) throw new NotFoundException('Material item not found');
      const job = await lockedFindOne(manager, ProductionJob, { id: jobId });
      if (!job) throw new NotFoundException('Production job not found');
      if (dto.quantity > item.stockQuantity) throw new BadRequestException(`Only ${item.stockQuantity} ${item.unit} of "${item.name}" left in stock`);
      const previous = item.stockQuantity;
      item.stockQuantity -= dto.quantity;
      await manager.getRepository(MaterialItem).save(item);
      const stocks = manager.getRepository(MaterialStockActivity);
      await stocks.save(stocks.create({ materialItemId: item.id, materialName: item.name, previousQuantity: previous, newQuantity: item.stockQuantity, reason: `Job ${job.jobNumber}`, actorEmail: actor }));
      const consumption = manager.getRepository(MaterialConsumption);
      return consumption.save(consumption.create({ jobId, materialItemId: item.id, materialName: item.name, quantity: dto.quantity, unit: dto.unit, recordedBy: actor }));
    });
  }
}
