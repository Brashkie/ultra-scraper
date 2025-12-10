import { Task } from '../types';
import { EventEmitter } from 'events';

export class DeadLetterQueue extends EventEmitter {
  private tasks: Map<string, Task> = new Map();
  private maxSize: number;

  // ✅ CORREGIDO: Constructor acepta maxSize
  constructor(maxSize: number = 10000) {
    super();
    this.maxSize = maxSize;
  }

  add(task: Task): void {
    // ✅ CORREGIDO: Verificar ANTES de agregar
    if (this.tasks.size >= this.maxSize) {
      // Eliminar la tarea más antigua
      const oldestId = this.tasks.keys().next().value;
      if (oldestId) {
        this.tasks.delete(oldestId);
        this.emit('overflow', { taskId: oldestId });
      }
    }

    this.tasks.set(task.id!, task);
    this.emit('taskAdded', { taskId: task.id }); // ✅ CORREGIDO: objeto con taskId
  }

  get(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  getAll(): Task[] {
    return Array.from(this.tasks.values());
  }

  remove(taskId: string): boolean {
    return this.tasks.delete(taskId);
  }

  clear(): void {
    this.tasks.clear();
  }

  size(): number {
    return this.tasks.size;
  }

  // Análisis de errores
  getErrorStats(): Record<string, number> {
    const stats: Record<string, number> = {};

    for (const task of this.tasks.values()) {
      const errorType = task.lastError?.name || 'Unknown';
      stats[errorType] = (stats[errorType] || 0) + 1;
    }

    return stats;
  }

  // Export para análisis
  export(): Array<{
    id: string;
    url: string;
    error: string;
    retries: number;
    failedAt: number;
  }> {
    return Array.from(this.tasks.values()).map(task => ({
      id: task.id!,
      url: (task as any).url || '',
      error: task.lastError?.message || '',
      retries: task.retries || 0,
      failedAt: task.failedAt || 0
    }));
  }
}