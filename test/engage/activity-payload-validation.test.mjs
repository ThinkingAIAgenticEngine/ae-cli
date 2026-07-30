import assert from 'node:assert/strict';
import {
  validateActivityTopicPayload,
  validateStandaloneActivityPayload,
} from '../../src/commands/te-engage/engage-activity/payload-validation.ts';

const contentGroups = [{
  contentList: [{ pushLanguageCode: 'default', content: '[]' }],
}];

assert.doesNotThrow(() => validateStandaloneActivityPayload({
  triggerType: 0,
  triggerTime: '2026-07-30 10:00',
  triggerTimeStrategy: 'fixed_time_zone',
  tzOffset: 8,
  expConfig: { enableExp: false },
  groupContentList: contentGroups,
}));

assert.throws(
  () => validateStandaloneActivityPayload({
    triggerType: 3,
    triggerTimeStrategy: 'fixed_time_zone',
    tzOffset: 8,
    expConfig: { enableExp: true, expType: 2 },
    groupContentList: [contentGroups[0], contentGroups[0]],
  }),
  (error) => error.code === 'ACTIVITY_TRIGGER_TYPE_UNSUPPORTED',
);

assert.throws(
  () => validateStandaloneActivityPayload({
    triggerType: 0,
    triggerTime: '2026-07-30 10:00',
    triggerTimeStrategy: 'fixed_time_zone',
    tzOffset: 8,
    expConfig: { enableExp: true, expType: 2 },
    groupContentList: contentGroups,
  }),
  (error) => error.code === 'ACTIVITY_EXPERIMENT_UNSUPPORTED',
);

assert.throws(
  () => validateActivityTopicPayload({
    triggerType: 0,
    triggerTime: '2026-07-30 10:00',
    tasks: [{
      taskName: 'task-1',
      clusterKey: 'cluster-1',
      groupContentList: contentGroups,
    }],
  }),
  (error) => error.code === 'TOPIC_TASK_OVERRIDE_UNSUPPORTED',
);

assert.doesNotThrow(() => validateActivityTopicPayload({
  triggerType: 0,
  triggerTime: '2026-07-30 10:00',
  modifyTaskList: [{
    taskId: '0001',
    taskName: 'task-1',
    targetClusterType: 1,
    groupContentList: contentGroups,
  }],
}));

assert.throws(
  () => validateActivityTopicPayload({
    triggerType: 0,
    triggerTime: '2026-07-30 10:00',
    modifyTaskList: [{
      taskId: '0001',
      taskName: 'task-1',
      targetClusterType: 2,
      groupContentList: contentGroups,
    }],
  }),
  (error) => error.code === 'TOPIC_TASK_OVERRIDE_UNSUPPORTED',
);

assert.throws(
  () => validateActivityTopicPayload({
    triggerType: 0,
    triggerTime: '2026-07-30 10:00',
    tasks: [{
      taskName: 'task-1',
      definitionRequest: { clusterOutFilters: [{ type: 'cluster' }] },
      groupContentList: contentGroups,
    }],
  }),
  (error) => error.code === 'TOPIC_TASK_AUDIENCE_EXCLUSION_UNSUPPORTED',
);
