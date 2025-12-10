import { EventEmitter } from 'events';
import { Task, TaskPriority, TaskStatus } from '../types/queue.types';
import { TaskQueue } from './TaskQueue';

interface ScheduleConfig {
  type: 'once' | 'interval' | 'cron' | 'delayed';
  
  // For 'once' and 'delayed'
  executeAt?: Date | number; // Date or timestamp
  delay?: number; // Delay in ms
  
  // For 'interval'
  interval?: number; // Interval in ms
  maxExecutions?: number; // Max number of executions
  
  // For 'cron'
  cronExpression?: string; // Cron expression
  timezone?: string;
  
  // Common
  priority?: TaskPriority;
  retryOnError?: boolean;
  maxRetries?: number;
  enabled?: boolean;
}

interface ScheduledTask {
  id: string;
  name: string;
  config: ScheduleConfig;
  task: Task;
  nextExecution?: number;
  lastExecution?: number;
  executionCount: number;
  successCount: number;
  errorCount: number;
  isRunning: boolean;
  enabled: boolean;
  timer?: NodeJS.Timeout;
}

export class QueueScheduler extends EventEmitter {
  private scheduledTasks: Map<string, ScheduledTask> = new Map();
  private queue: TaskQueue;
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(queue: TaskQueue) {
    super();
    this.queue = queue;
    
    // Start scheduler loop
    this.startScheduler();
  }

  // Schedule a task
  schedule(
    id: string,
    name: string,
    taskFactory: () => Task,
    config: ScheduleConfig
  ): void {
    if (this.scheduledTasks.has(id)) {
      throw new Error(`Scheduled task ${id} already exists`);
    }

    const scheduledTask: ScheduledTask = {
      id,
      name,
      config: { enabled: true, ...config },
      task: taskFactory(),
      executionCount: 0,
      successCount: 0,
      errorCount: 0,
      isRunning: false,
      enabled: config.enabled !== false
    };

    // Calculate next execution
    this.calculateNextExecution(scheduledTask);

    // Setup timer based on type
    this.setupTaskTimer(scheduledTask, taskFactory);

    this.scheduledTasks.set(id, scheduledTask);
    
    this.emit('taskScheduled', {
      id,
      name,
      config,
      nextExecution: scheduledTask.nextExecution
    });
  }

  private setupTaskTimer(scheduledTask: ScheduledTask, taskFactory: () => Task): void {
    const { config } = scheduledTask;

    switch (config.type) {
      case 'once':
        this.setupOnceTask(scheduledTask, taskFactory);
        break;
      
      case 'delayed':
        this.setupDelayedTask(scheduledTask, taskFactory);
        break;
      
      case 'interval':
        this.setupIntervalTask(scheduledTask, taskFactory);
        break;
      
      case 'cron':
        // Cron tasks are handled by the scheduler loop
        break;
    }
  }

  private setupOnceTask(scheduledTask: ScheduledTask, taskFactory: () => Task): void {
    const { config } = scheduledTask;
    const executeAt = config.executeAt instanceof Date 
      ? config.executeAt.getTime() 
      : config.executeAt!;

    const delay = executeAt - Date.now();

    if (delay > 0) {
      scheduledTask.timer = setTimeout(async () => {
        await this.executeScheduledTask(scheduledTask, taskFactory);
        this.unschedule(scheduledTask.id); // Remove after execution
      }, delay);
    } else {
      // Execute immediately
      this.executeScheduledTask(scheduledTask, taskFactory);
      this.unschedule(scheduledTask.id);
    }
  }

  private setupDelayedTask(scheduledTask: ScheduledTask, taskFactory: () => Task): void {
    const { config } = scheduledTask;
    const delay = config.delay!;

    scheduledTask.timer = setTimeout(async () => {
      await this.executeScheduledTask(scheduledTask, taskFactory);
      this.unschedule(scheduledTask.id); // Remove after execution
    }, delay);
  }

  private setupIntervalTask(scheduledTask: ScheduledTask, taskFactory: () => Task): void {
    const { config } = scheduledTask;
    const interval = config.interval!;

    scheduledTask.timer = setInterval(async () => {
      // Check if max executions reached
      if (config.maxExecutions && 
          scheduledTask.executionCount >= config.maxExecutions) {
        this.unschedule(scheduledTask.id);
        return;
      }

      await this.executeScheduledTask(scheduledTask, taskFactory);
    }, interval);
  }

  private calculateNextExecution(scheduledTask: ScheduledTask): void {
    const { config } = scheduledTask;
    const now = Date.now();

    switch (config.type) {
      case 'once':
        scheduledTask.nextExecution = config.executeAt instanceof Date
          ? config.executeAt.getTime()
          : config.executeAt!;
        break;

      case 'delayed':
        scheduledTask.nextExecution = now + config.delay!;
        break;

      case 'interval':
        if (scheduledTask.lastExecution) {
          scheduledTask.nextExecution = scheduledTask.lastExecution + config.interval!;
        } else {
          scheduledTask.nextExecution = now + config.interval!;
        }
        break;

      case 'cron':
        scheduledTask.nextExecution = this.calculateNextCronExecution(
          config.cronExpression!,
          config.timezone
        );
        break;
    }
  }

  private calculateNextCronExecution(expression: string, timezone?: string): number {
    // Parse cron expression
    const parts = expression.trim().split(/\s+/);
    
    if (parts.length < 5) {
      throw new Error('Invalid cron expression. Expected at least 5 fields.');
    }

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

    const now = new Date();
    let next = new Date(now);
    next.setSeconds(0);
    next.setMilliseconds(0);

    // Simple cron parser (supports basic expressions)
    // Format: minute hour day month dayOfWeek
    
    // Parse minute
    if (minute !== '*') {
      const minutes = this.parseCronField(minute, 0, 59);
      const nextMinute = this.getNextValue(now.getMinutes(), minutes);
      
      if (nextMinute > now.getMinutes()) {
        next.setMinutes(nextMinute);
      } else {
        next.setHours(next.getHours() + 1);
        next.setMinutes(nextMinute);
      }
    }

    // Parse hour
    if (hour !== '*') {
      const hours = this.parseCronField(hour, 0, 23);
      const nextHour = this.getNextValue(now.getHours(), hours);
      
      if (nextHour > now.getHours() || 
          (nextHour === now.getHours() && next.getMinutes() > now.getMinutes())) {
        next.setHours(nextHour);
      } else {
        next.setDate(next.getDate() + 1);
        next.setHours(nextHour);
      }
    }

    // Parse day of month
    if (dayOfMonth !== '*') {
      const days = this.parseCronField(dayOfMonth, 1, 31);
      const nextDay = this.getNextValue(now.getDate(), days);
      
      if (nextDay > now.getDate()) {
        next.setDate(nextDay);
      } else {
        next.setMonth(next.getMonth() + 1);
        next.setDate(nextDay);
      }
    }

    // Parse month
    if (month !== '*') {
      const months = this.parseCronField(month, 1, 12);
      const nextMonth = this.getNextValue(now.getMonth() + 1, months);
      
      if (nextMonth > now.getMonth() + 1) {
        next.setMonth(nextMonth - 1);
      } else {
        next.setFullYear(next.getFullYear() + 1);
        next.setMonth(nextMonth - 1);
      }
    }

    // Parse day of week (0-6, Sunday = 0)
    if (dayOfWeek !== '*') {
      const daysOfWeek = this.parseCronField(dayOfWeek, 0, 6);
      let currentDayOfWeek = next.getDay();
      let daysToAdd = 0;

      // Find next matching day of week
      for (let i = 0; i < 7; i++) {
        const checkDay = (currentDayOfWeek + i) % 7;
        if (daysOfWeek.includes(checkDay)) {
          daysToAdd = i;
          break;
        }
      }

      if (daysToAdd > 0) {
        next.setDate(next.getDate() + daysToAdd);
      }
    }

    // Ensure next execution is in the future
    if (next <= now) {
      next.setMinutes(next.getMinutes() + 1);
    }

    return next.getTime();
  }

  private parseCronField(field: string, min: number, max: number): number[] {
    const values: number[] = [];

    // Handle ranges (e.g., 1-5)
    if (field.includes('-')) {
      const [start, end] = field.split('-').map(Number);
      for (let i = start; i <= end; i++) {
        if (i >= min && i <= max) {
          values.push(i);
        }
      }
      return values;
    }

    // Handle lists (e.g., 1,3,5)
    if (field.includes(',')) {
      return field.split(',')
        .map(Number)
        .filter(n => n >= min && n <= max);
    }

    // Handle step values (e.g., */5)
    if (field.includes('/')) {
      const [range, step] = field.split('/');
      const stepNum = Number(step);
      
      if (range === '*') {
        for (let i = min; i <= max; i += stepNum) {
          values.push(i);
        }
      }
      return values;
    }

    // Single value
    const value = Number(field);
    if (value >= min && value <= max) {
      values.push(value);
    }

    return values;
  }

  private getNextValue(current: number, allowed: number[]): number {
    // Find next allowed value
    for (const value of allowed.sort((a, b) => a - b)) {
      if (value > current) {
        return value;
      }
    }
    // Wrap around
    return allowed[0];
  }

  private async executeScheduledTask(
    scheduledTask: ScheduledTask,
    taskFactory: () => Task
  ): Promise<void> {
    if (!scheduledTask.enabled || scheduledTask.isRunning) {
      return;
    }

    scheduledTask.isRunning = true;
    scheduledTask.executionCount++;
    scheduledTask.lastExecution = Date.now();

    this.emit('taskExecuting', {
      id: scheduledTask.id,
      name: scheduledTask.name,
      executionCount: scheduledTask.executionCount
    });

    try {
      // Create new task instance
      const task = taskFactory();
      task.priority = scheduledTask.config.priority || TaskPriority.NORMAL;

      // Add to queue
      await this.queue.add(task);

      scheduledTask.successCount++;

      this.emit('taskExecuted', {
        id: scheduledTask.id,
        name: scheduledTask.name,
        success: true
      });

    } catch (error) {
      scheduledTask.errorCount++;

      this.emit('taskExecutionError', {
        id: scheduledTask.id,
        name: scheduledTask.name,
        error
      });

      // Retry logic
      if (scheduledTask.config.retryOnError) {
        const maxRetries = scheduledTask.config.maxRetries || 3;
        if (scheduledTask.errorCount < maxRetries) {
          // Schedule retry
          setTimeout(() => {
            this.executeScheduledTask(scheduledTask, taskFactory);
          }, 5000); // Retry after 5 seconds
        }
      }

    } finally {
      scheduledTask.isRunning = false;

      // Calculate next execution for cron tasks
      if (scheduledTask.config.type === 'cron') {
        this.calculateNextExecution(scheduledTask);
      }
    }
  }

  // Scheduler loop for cron tasks
  private startScheduler(): void {
    this.checkInterval = setInterval(() => {
      this.checkScheduledTasks();
    }, 1000); // Check every second
  }

  private checkScheduledTasks(): void {
    const now = Date.now();

    for (const [id, scheduledTask] of this.scheduledTasks) {
      if (!scheduledTask.enabled || scheduledTask.isRunning) {
        continue;
      }

      // Only check cron tasks here (others use timers)
      if (scheduledTask.config.type !== 'cron') {
        continue;
      }

      if (scheduledTask.nextExecution && now >= scheduledTask.nextExecution) {
        // Execute task
        const taskFactory = () => scheduledTask.task;
        this.executeScheduledTask(scheduledTask, taskFactory);
      }
    }
  }

  // Unschedule a task
  unschedule(id: string): boolean {
    const scheduledTask = this.scheduledTasks.get(id);
    
    if (!scheduledTask) {
      return false;
    }

    // Clear timer
    if (scheduledTask.timer) {
      if (scheduledTask.config.type === 'interval') {
        clearInterval(scheduledTask.timer);
      } else {
        clearTimeout(scheduledTask.timer);
      }
    }

    this.scheduledTasks.delete(id);

    this.emit('taskUnscheduled', { id, name: scheduledTask.name });

    return true;
  }

  // Enable/disable task
  enableTask(id: string): boolean {
    const task = this.scheduledTasks.get(id);
    if (task) {
      task.enabled = true;
      this.emit('taskEnabled', { id });
      return true;
    }
    return false;
  }

  disableTask(id: string): boolean {
    const task = this.scheduledTasks.get(id);
    if (task) {
      task.enabled = false;
      this.emit('taskDisabled', { id });
      return true;
    }
    return false;
  }

  // Pause/resume scheduler
  pause(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.emit('paused');
  }

  resume(): void {
    if (!this.checkInterval) {
      this.startScheduler();
    }
    this.emit('resumed');
  }

  // Get task info
  getTask(id: string): ScheduledTask | undefined {
    return this.scheduledTasks.get(id);
  }

  getAllTasks(): ScheduledTask[] {
    return Array.from(this.scheduledTasks.values());
  }

  getTaskStats(id: string) {
    const task = this.scheduledTasks.get(id);
    
    if (!task) {
      return null;
    }

    const successRate = task.executionCount > 0
      ? task.successCount / task.executionCount
      : 0;

    const errorRate = task.executionCount > 0
      ? task.errorCount / task.executionCount
      : 0;

    return {
      id: task.id,
      name: task.name,
      type: task.config.type,
      enabled: task.enabled,
      isRunning: task.isRunning,
      executionCount: task.executionCount,
      successCount: task.successCount,
      errorCount: task.errorCount,
      successRate,
      errorRate,
      lastExecution: task.lastExecution,
      nextExecution: task.nextExecution,
      timeUntilNext: task.nextExecution 
        ? task.nextExecution - Date.now() 
        : null
    };
  }

  getAllStats() {
    const tasks = Array.from(this.scheduledTasks.values());
    
    return {
      totalTasks: tasks.length,
      enabledTasks: tasks.filter(t => t.enabled).length,
      disabledTasks: tasks.filter(t => !t.enabled).length,
      runningTasks: tasks.filter(t => t.isRunning).length,
      totalExecutions: tasks.reduce((sum, t) => sum + t.executionCount, 0),
      totalSuccesses: tasks.reduce((sum, t) => sum + t.successCount, 0),
      totalErrors: tasks.reduce((sum, t) => sum + t.errorCount, 0),
      tasks: tasks.map(t => ({
        id: t.id,
        name: t.name,
        type: t.config.type,
        enabled: t.enabled,
        nextExecution: t.nextExecution
      }))
    };
  }

  // Trigger task manually
  async trigger(id: string): Promise<void> {
    const scheduledTask = this.scheduledTasks.get(id);
    
    if (!scheduledTask) {
      throw new Error(`Scheduled task ${id} not found`);
    }

    const taskFactory = () => scheduledTask.task;
    await this.executeScheduledTask(scheduledTask, taskFactory);
  }

  // Clear all tasks
  clear(): void {
    for (const [id] of this.scheduledTasks) {
      this.unschedule(id);
    }

    this.emit('cleared');
  }

  // Shutdown
  async shutdown(): Promise<void> {
    this.pause();
    this.clear();
    this.emit('shutdown');
  }
}

// Utility: Create cron expression builders
export class CronBuilder {
  static everyMinute(): string {
    return '* * * * *';
  }

  static everyHour(): string {
    return '0 * * * *';
  }

  static everyDay(hour: number = 0, minute: number = 0): string {
    return `${minute} ${hour} * * *`;
  }

  static everyWeek(dayOfWeek: number = 0, hour: number = 0, minute: number = 0): string {
    return `${minute} ${hour} * * ${dayOfWeek}`;
  }

  static everyMonth(day: number = 1, hour: number = 0, minute: number = 0): string {
    return `${minute} ${hour} ${day} * *`;
  }

  static custom(minute: string, hour: string, day: string, month: string, dayOfWeek: string): string {
    return `${minute} ${hour} ${day} ${month} ${dayOfWeek}`;
  }
}