import { PriorityQueue } from '../../src/queue/PriorityQueue';
import { TaskPriority } from '../../src/types/queue.types';

describe('PriorityQueue', () => {
  let queue: PriorityQueue;

  beforeEach(() => {
    queue = new PriorityQueue();
  });

  describe('Basic Operations', () => {
    it('should enqueue and dequeue by priority', () => {
      // Agregar en orden: normal, high, critical
      queue.enqueue({
        id: 'normal',
        priority: TaskPriority.NORMAL,
        execute: async () => 'normal'
      });

      queue.enqueue({
        id: 'high',
        priority: TaskPriority.HIGH,
        execute: async () => 'high'
      });

      queue.enqueue({
        id: 'critical',
        priority: TaskPriority.CRITICAL,
        execute: async () => 'critical'
      });

      queue.enqueue({
        id: 'low',
        priority: TaskPriority.LOW,
        execute: async () => 'low'
      });

      // Dequeue debe sacar en orden: critical → high → normal → low
      const first = queue.dequeue();
      expect(first?.id).toBe('critical');

      const second = queue.dequeue();
      expect(second?.id).toBe('high');

      const third = queue.dequeue();
      expect(third?.id).toBe('normal');

      const fourth = queue.dequeue();
      expect(fourth?.id).toBe('low');
    });

    it('should find task by id', () => {
      queue.enqueue({
        id: 'find-me',
        priority: TaskPriority.NORMAL,
        execute: async () => 'found'
      });

      const task = queue.findById('find-me');
      expect(task).toBeDefined();
      expect(task?.id).toBe('find-me');
    });

    it('should remove task by id', () => {
      queue.enqueue({
        id: 'remove-me',
        priority: TaskPriority.NORMAL,
        execute: async () => 'removed'
      });

      expect(queue.size()).toBe(1);

      const removed = queue.remove('remove-me');
      expect(removed).toBe(true);
      expect(queue.size()).toBe(0);
    });

    it('should return correct queue sizes', () => {
      expect(queue.size()).toBe(0);
      expect(queue.isEmpty()).toBe(true);

      queue.enqueue({
        id: 'task-1',
        priority: TaskPriority.NORMAL,
        execute: async () => 'result'
      });

      expect(queue.size()).toBe(1);
      expect(queue.isEmpty()).toBe(false);

      queue.enqueue({
        id: 'task-2',
        priority: TaskPriority.HIGH,
        execute: async () => 'result'
      });

      expect(queue.size()).toBe(2);
    });

    it('should handle empty queue', () => {
      expect(queue.dequeue()).toBeNull();
      expect(queue.isEmpty()).toBe(true);
      expect(queue.size()).toBe(0);
    });
  });

  describe('Priority Handling', () => {
    it('should maintain priority order with same priority tasks', () => {
      // Agregar múltiples tareas con la misma prioridad
      queue.enqueue({
        id: 'high-1',
        priority: TaskPriority.HIGH,
        execute: async () => 'result'
      });

      queue.enqueue({
        id: 'high-2',
        priority: TaskPriority.HIGH,
        execute: async () => 'result'
      });

      queue.enqueue({
        id: 'high-3',
        priority: TaskPriority.HIGH,
        execute: async () => 'result'
      });

      // Con la misma prioridad, deberían salir en orden FIFO
      const first = queue.dequeue();
      expect(first?.id).toBe('high-1');

      const second = queue.dequeue();
      expect(second?.id).toBe('high-2');

      const third = queue.dequeue();
      expect(third?.id).toBe('high-3');
    });

    it('should handle mixed priorities correctly', () => {
      const tasks = [
        { id: 'low-1', priority: TaskPriority.LOW },
        { id: 'critical-1', priority: TaskPriority.CRITICAL },
        { id: 'normal-1', priority: TaskPriority.NORMAL },
        { id: 'high-1', priority: TaskPriority.HIGH },
        { id: 'low-2', priority: TaskPriority.LOW },
        { id: 'critical-2', priority: TaskPriority.CRITICAL }
      ];

      tasks.forEach(t => {
        queue.enqueue({
          id: t.id,
          priority: t.priority,
          execute: async () => 'result'
        });
      });

      // Orden esperado: critical-1, critical-2, high-1, normal-1, low-1, low-2
      expect(queue.dequeue()?.id).toBe('critical-1');
      expect(queue.dequeue()?.id).toBe('critical-2');
      expect(queue.dequeue()?.id).toBe('high-1');
      expect(queue.dequeue()?.id).toBe('normal-1');
      expect(queue.dequeue()?.id).toBe('low-1');
      expect(queue.dequeue()?.id).toBe('low-2');
    });
  });

  describe('Utility Methods', () => {
    it('should peek at next task without removing', () => {
      queue.enqueue({
        id: 'peek-task',
        priority: TaskPriority.HIGH,
        execute: async () => 'result'
      });

      const peeked = queue.peek();
      expect(peeked?.id).toBe('peek-task');
      expect(queue.size()).toBe(1); // No debería eliminarse
    });

    it('should clear all tasks', () => {
      queue.enqueue({
        id: 'task-1',
        priority: TaskPriority.NORMAL,
        execute: async () => 'result'
      });

      queue.enqueue({
        id: 'task-2',
        priority: TaskPriority.HIGH,
        execute: async () => 'result'
      });

      expect(queue.size()).toBe(2);

      queue.clear();

      expect(queue.size()).toBe(0);
      expect(queue.isEmpty()).toBe(true);
    });

    it('should get all tasks', () => {
      queue.enqueue({
        id: 'task-1',
        priority: TaskPriority.NORMAL,
        execute: async () => 'result'
      });

      queue.enqueue({
        id: 'task-2',
        priority: TaskPriority.HIGH,
        execute: async () => 'result'
      });

      const allTasks = queue.getAll();
      expect(allTasks.length).toBe(2);
      expect(allTasks.some(t => t.id === 'task-1')).toBe(true);
      expect(allTasks.some(t => t.id === 'task-2')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle removing non-existent task', () => {
      const removed = queue.remove('does-not-exist');
      expect(removed).toBe(false);
    });

    it('should handle finding non-existent task', () => {
      const task = queue.findById('does-not-exist');
      expect(task).toBeUndefined();
    });

    it('should handle default priority', () => {
      queue.enqueue({
        id: 'default-priority',
        // Sin priority definido
        execute: async () => 'result'
      });

      const task = queue.dequeue();
      expect(task?.id).toBe('default-priority');
      expect(task?.priority).toBeDefined();
    });
  });
});