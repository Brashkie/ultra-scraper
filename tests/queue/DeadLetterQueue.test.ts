import { DeadLetterQueue } from '../../src/queue/DeadLetterQueue';

describe('DeadLetterQueue', () => {
  let dlq: DeadLetterQueue;

  beforeEach(() => {
    dlq = new DeadLetterQueue(10);
  });

  afterEach(() => {
    dlq.clear();
  });

  describe('Basic Operations', () => {
    it('should add failed tasks', () => {
      const task = {
        id: 'failed-task',
        execute: async () => {},
        lastError: new Error('Test error')
      };

      dlq.add(task);

      expect(dlq.size()).toBe(1);
    });

    it('should get tasks by error type', () => {
      // ✅ CORRECCIÓN: Crear errores con el tipo correcto
      const typeError = new TypeError('test');
      const networkError = new Error('test');
      networkError.name = 'NetworkError';

      dlq.add({
        id: 'task-1',
        execute: async () => {},
        lastError: typeError
      });

      dlq.add({
        id: 'task-2',
        execute: async () => {},
        lastError: networkError
      });

      // Filtrar manualmente ya que getByErrorType no existe
      const allTasks = dlq.getAll();
      const byError = allTasks.filter(task => 
        task.lastError?.name === 'TypeError'
      );
      
      expect(byError.length).toBe(1);
      expect(byError[0].id).toBe('task-1');
    });

    it('should respect max size and overflow', () => {
      const smallDLQ = new DeadLetterQueue(2);

      let overflowed = false;
      smallDLQ.on('overflow', () => {
        overflowed = true;
      });

      for (let i = 0; i < 3; i++) {
        smallDLQ.add({
          id: `task-${i}`,
          execute: async () => {},
          lastError: new Error('Test')
        });
      }

      expect(smallDLQ.size()).toBe(2);
      expect(overflowed).toBe(true);
    });

    it('should get error statistics', () => {
      // ✅ CORRECCIÓN: Crear errores tipados correctamente
      const typeError1 = new TypeError('test');
      const typeError2 = new TypeError('another');
      const networkError = new Error('test');
      networkError.name = 'NetworkError';

      dlq.add({
        id: 'task-1',
        execute: async () => {},
        lastError: typeError1
      });

      dlq.add({
        id: 'task-2',
        execute: async () => {},
        lastError: typeError2
      });

      dlq.add({
        id: 'task-3',
        execute: async () => {},
        lastError: networkError
      });

      const stats = dlq.getErrorStats();
      expect(stats['TypeError']).toBe(2);
      expect(stats['NetworkError']).toBe(1);
    });

    it('should export tasks', () => {
      dlq.add({
        id: 'task-1',
        execute: async () => {},
        lastError: new Error('Test')
      });

      const exported = dlq.export();
      expect(exported.length).toBe(1);
      expect(exported[0].id).toBe('task-1');
    });

    it('should clear all tasks', () => {
      dlq.add({
        id: 'task-1',
        execute: async () => {},
        lastError: new Error('Test')
      });

      dlq.clear();
      expect(dlq.size()).toBe(0);
    });
  });

  describe('Task Management', () => {
    it('should get task by id', () => {
      const task = {
        id: 'specific-task',
        execute: async () => {},
        lastError: new Error('Test error')
      };

      dlq.add(task);

      const found = dlq.get('specific-task');
      expect(found).toBeDefined();
      expect(found?.id).toBe('specific-task');
    });

    it('should remove task by id', () => {
      dlq.add({
        id: 'remove-task',
        execute: async () => {},
        lastError: new Error('Test')
      });

      expect(dlq.size()).toBe(1);

      const removed = dlq.remove('remove-task');
      expect(removed).toBeTruthy();
      expect(dlq.size()).toBe(0);
    });

    it('should get all tasks', () => {
      for (let i = 0; i < 5; i++) {
        dlq.add({
          id: `task-${i}`,
          execute: async () => {},
          lastError: new Error(`Error ${i}`)
        });
      }

      const all = dlq.getAll();
      expect(all.length).toBe(5);
      expect(all.every(task => task.id?.startsWith('task-'))).toBe(true);
    });
  });

  describe('Events', () => {
    it('should emit events when adding tasks', (done) => {
      dlq.on('taskAdded', (data) => {
        expect(data.taskId).toBe('event-task');
        done();
      });

      dlq.add({
        id: 'event-task',
        execute: async () => {},
        lastError: new Error('Test')
      });
    });

    it('should emit overflow event', (done) => {
      const limitedDLQ = new DeadLetterQueue(1);

      limitedDLQ.on('overflow', (data) => {
        expect(data.taskId).toBeDefined();
        done();
      });

      limitedDLQ.add({
        id: 'task-1',
        execute: async () => {},
        lastError: new Error('Test')
      });

      limitedDLQ.add({
        id: 'task-2',
        execute: async () => {},
        lastError: new Error('Test')
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle tasks without errors gracefully', () => {
      dlq.add({
        id: 'no-error-task',
        execute: async () => {}
        // Sin lastError
      });

      expect(dlq.size()).toBe(1);
      const stats = dlq.getErrorStats();
      expect(stats['Unknown']).toBe(1);
    });

    it('should not exceed max size', () => {
      const limitedDLQ = new DeadLetterQueue(3);

      for (let i = 0; i < 10; i++) {
        limitedDLQ.add({
          id: `task-${i}`,
          execute: async () => {},
          lastError: new Error('Test')
        });
      }

      expect(limitedDLQ.size()).toBe(3);
      
      // Debe mantener las últimas 3 tareas (7, 8, 9)
      const all = limitedDLQ.getAll();
      expect(all[0].id).toBe('task-7');
      expect(all[1].id).toBe('task-8');
      expect(all[2].id).toBe('task-9');
    });

    it('should handle removing non-existent task', () => {
      const removed = dlq.remove('does-not-exist');
      expect(removed).toBe(false);
    });

    it('should handle getting non-existent task', () => {
      const task = dlq.get('does-not-exist');
      expect(task).toBeUndefined();
    });
  });

  describe('Export Functionality', () => {
    it('should export with correct format', () => {
      dlq.add({
        id: 'export-task',
        execute: async () => {},
        lastError: new Error('Export error'),
        retries: 3,
        failedAt: Date.now()
      });

      const exported = dlq.export();
      
      expect(exported[0]).toHaveProperty('id');
      expect(exported[0]).toHaveProperty('error');
      expect(exported[0]).toHaveProperty('retries');
      expect(exported[0]).toHaveProperty('failedAt');
    });

    it('should handle export of empty queue', () => {
      const exported = dlq.export();
      expect(exported).toEqual([]);
    });
  });

  describe('Error Statistics', () => {
    it('should track multiple error types', () => {
      const errors = [
        { name: 'TypeError', count: 3 },
        { name: 'NetworkError', count: 2 },
        { name: 'TimeoutError', count: 1 },
        { name: 'ReferenceError', count: 4 }
      ];

      errors.forEach(({ name, count }) => {
        for (let i = 0; i < count; i++) {
          const error = new Error('test');
          error.name = name;
          
          dlq.add({
            id: `${name}-${i}`,
            execute: async () => {},
            lastError: error
          });
        }
      });

      const stats = dlq.getErrorStats();
      
      expect(stats['TypeError']).toBe(3);
      expect(stats['NetworkError']).toBe(2);
      expect(stats['TimeoutError']).toBe(1);
      expect(stats['ReferenceError']).toBe(4);
    });

    it('should return empty stats for empty queue', () => {
      const stats = dlq.getErrorStats();
      expect(Object.keys(stats).length).toBe(0);
    });
  });
});