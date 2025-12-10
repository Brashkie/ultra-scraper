import { Task, TaskPriority } from '../types/queue.types';

interface PriorityQueueNode {
  task: Task;
  priority: number;
}

export class PriorityQueue {
  private queues: Map<number, Task[]> = new Map();
  private priorities: number[] = [
    TaskPriority.CRITICAL,
    TaskPriority.HIGH,
    TaskPriority.NORMAL,
    TaskPriority.LOW
  ];

  constructor() {
    // Inicializar colas para cada prioridad
    this.priorities.forEach(priority => {
      this.queues.set(priority, []);
    });
  }

  /**
   * Agrega una tarea a la cola según su prioridad
   */
  enqueue(task: Task): void {
    const priority = task.priority ?? TaskPriority.NORMAL;
    task.priority = priority; // Asegurar que tenga prioridad
    
    const queue = this.queues.get(priority);
    if (queue) {
      queue.push(task);
    } else {
      this.queues.set(priority, [task]);
    }
  }

  /**
   * Obtiene y elimina la tarea de mayor prioridad
   */
  dequeue(): Task | null | undefined {
    for (const priority of this.priorities) {
      const queue = this.queues.get(priority);
      if (queue && queue.length > 0) {
        return queue.shift();
      }
    }
    return null;
  }

  /**
   * Obtiene la tarea de mayor prioridad sin eliminarla
   */
  peek(): Task | null | undefined {
    for (const priority of this.priorities) {
      const queue = this.queues.get(priority);
      if (queue && queue.length > 0) {
        return queue[0];
      }
    }
    return null;
  }

  /**
   * Busca una tarea por su ID
   */
  findById(taskId: string): Task | undefined {
    for (const queue of this.queues.values()) {
      const task = queue.find(t => t.id === taskId);
      if (task) {
        return task;
      }
    }
    return undefined;
  }

  /**
   * Elimina una tarea por su ID
   */
  remove(taskId: string): boolean {
    for (const queue of this.queues.values()) {
      const index = queue.findIndex(t => t.id === taskId);
      if (index !== -1) {
        queue.splice(index, 1);
        return true;
      }
    }
    return false;
  }

  /**
   * Alias de remove para compatibilidad
   */
  removeById(taskId: string): boolean {
    return this.remove(taskId);
  }

  /**
   * Obtiene el tamaño total de la cola
   */
  size(): number {
    let total = 0;
    for (const queue of this.queues.values()) {
      total += queue.length;
    }
    return total;
  }

  /**
   * Verifica si la cola está vacía
   */
  isEmpty(): boolean {
    return this.size() === 0;
  }

  /**
   * Limpia todas las colas
   */
  clear(): void {
    this.queues.forEach(queue => queue.length = 0);
  }

  /**
   * Obtiene todas las tareas
   */
  getAll(): Task[] {
    const allTasks: Task[] = [];
    for (const priority of this.priorities) {
      const queue = this.queues.get(priority);
      if (queue) {
        allTasks.push(...queue);
      }
    }
    return allTasks;
  }

  /**
   * Reordena las tareas (útil cuando se cambia la prioridad)
   */
  reorder(): void {
    // Obtener todas las tareas
    const allTasks = this.getAll();
    
    // Limpiar colas
    this.clear();
    
    // Re-agregar con las nuevas prioridades
    allTasks.forEach(task => this.enqueue(task));
  }

  /**
   * Obtiene estadísticas de la cola
   */
  getStats() {
    const stats: Record<string, number> = {};
    
    this.priorities.forEach(priority => {
      const queue = this.queues.get(priority);
      const priorityName = TaskPriority[priority];
      stats[priorityName] = queue?.length || 0;
    });
    
    return {
      total: this.size(),
      byPriority: stats
    };
  }
}