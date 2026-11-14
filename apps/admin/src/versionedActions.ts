import {api} from './api';

// Edits made from a record on screen carry that record's version so the server can spot stale writes.
type Versioned = {id: string; version?: number};

export const releaseOrder = (order: Versioned, overrideReason?: string) => api.releaseOrder(order.id, overrideReason, order.version);
export const moveJob = (job: Versioned, data: Record<string, unknown>) => api.updateProductionJob(job.id, {...data, expectedVersion: job.version});
export const updateCustomer = <T>(customer: Versioned, data: Record<string, unknown>) => api.updateCustomer<T>(customer.id, {...data, expectedVersion: customer.version});
export const setProductStock = (product: Versioned, stock: number, reason: string) => api.adjustStock(product.id, stock, reason, product.version);
export const setMaterialStock = (material: Versioned, stockQuantity: number, reason: string) => api.adjustMaterialStock(material.id, {stockQuantity, reason, expectedVersion: material.version});
export const recordMaterialCount = (material: Versioned, measuredQuantity: number, note?: string) => api.recordMaterialCount(material.id, {measuredQuantity, note, expectedVersion: material.version});
export const recordProductCount = (product: Versioned, measuredQuantity: number, note?: string) => api.recordProductCount(product.id, {measuredQuantity, note, expectedVersion: product.version});
