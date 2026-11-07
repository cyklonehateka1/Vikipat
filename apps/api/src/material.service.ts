import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { lockedFindOne } from './db';
import { dateOnly } from './finance';
import { AdjustMaterialStockDto, CreateMaterialItemDto, LogMaterialConsumptionDto, UpdateMaterialItemDto } from './dto';
import { MaterialConsumption, MaterialItem, MaterialStockActivity, ProductionJob } from './entities';
import { AuthService } from './auth.service';

// Same try/catch-to-BadRequestException shape already used by AnalyticsService/PeopleService for dateOnly().
function validDate(value: string): string {
  try { return dateOnly(value); } catch { throw new BadRequestException('Enter a valid calendar date'); }
}

@Injectable()
export class MaterialService {
  constructor(
    @InjectRepository(MaterialItem) private materials: Repository<MaterialItem>,
    @InjectRepository(MaterialStockActivity) private stocks: Repository<MaterialStockActivity>,
    private auth: AuthService,
    @InjectRepository(ProductionJob) private jobs: Repository<ProductionJob>,
    @InjectRepository(MaterialConsumption) private consumption: Repository<MaterialConsumption>,
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

  private rollWidthMetresFrom(value: number, unit: 'ft'|'in'|'cm'): number {
    if (unit === 'ft') return value * 0.3048;
    if (unit === 'in') return value * 0.0254;
    return value * 0.01;
  }

  async create(dto: CreateMaterialItemDto, email: string) {
    const { rollWidthValue, rollWidthUnit, ...rest } = dto;
    const entity = this.materials.create({ kind: 'count', rollWidthMetres: null, serviceCode: null, ...rest });
    if (dto.kind === 'roll' && rollWidthValue !== undefined && rollWidthUnit) {
      entity.rollWidthMetres = this.rollWidthMetresFrom(rollWidthValue, rollWidthUnit);
    }
    const item = await this.materials.save(entity);
    await this.auth.audit(email, 'create', 'material_item', item.id, { name: item.name });
    return item;
  }

  async update(id: string, dto: UpdateMaterialItemDto, email: string) {
    const item = await this.one(id);
    const previousStock = item.stockQuantity;
    const { rollWidthValue, rollWidthUnit, ...rest } = dto;
    Object.assign(item, rest);
    if (item.kind === 'roll' && rollWidthValue !== undefined && rollWidthUnit) {
      item.rollWidthMetres = this.rollWidthMetresFrom(rollWidthValue, rollWidthUnit);
    }
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

  /**
   * Two independent numbers for a person to compare, not a computed
   * variance — this shop has never configured a material-to-service-code
   * mapping, and inventing one here would be fiction (see
   * docs/superpowers/specs/2026-10-31-internal-controls-system.md).
   */
  async reconciliation(from: string, to: string) {
    const range = Between(new Date(`${validDate(from)}T00:00:00.000Z`), new Date(`${validDate(to)}T23:59:59.999Z`));
    const jobs = await this.jobs.find({ where: { createdAt: range } });
    const billed = new Map<string, { serviceCode: string; serviceName: string; totalAreaSqFt: number }>();
    for (const job of jobs) {
      let spec: { totalAreaSqFt?: number };
      try { spec = JSON.parse(job.specification || '{}'); } catch { spec = {}; }
      const area = Number(spec.totalAreaSqFt) || 0;
      if (!area) continue;
      const existing = billed.get(job.serviceCode);
      if (existing) existing.totalAreaSqFt += area;
      else billed.set(job.serviceCode, { serviceCode: job.serviceCode, serviceName: job.title, totalAreaSqFt: area });
    }

    const consumed = await this.consumption.find({ where: { createdAt: range } });
    const logged = new Map<string, { materialName: string; totalQuantity: number; unit: string }>();
    for (const row of consumed) {
      const existing = logged.get(row.materialName);
      if (existing) existing.totalQuantity += row.quantity;
      else logged.set(row.materialName, { materialName: row.materialName, totalQuantity: row.quantity, unit: row.unit });
    }

    return {
      billedByServiceCode: [...billed.values()].sort((a, b) => b.totalAreaSqFt - a.totalAreaSqFt),
      loggedByMaterial: [...logged.values()].sort((a, b) => b.totalQuantity - a.totalQuantity),
    };
  }
}
