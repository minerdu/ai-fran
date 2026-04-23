'use client';

import styles from './RunParentChildTree.module.css';

const NODE_STATUS_LABELS = {
  active: '进行中',
  pending: '待处理',
  done: '已完成',
  info: '信息',
};

function TreeNode({ node, level = 0 }) {
  return (
    <div className={styles.node} data-level={level}>
      <div className={`${styles.nodeCard} ${styles[`node_${node.status || 'info'}`] || ''}`}>
        <div className={styles.nodeHeader}>
          <span className={styles.nodeTitle}>{node.label}</span>
          <span className={styles.nodeStatus}>{NODE_STATUS_LABELS[node.status] || '信息'}</span>
        </div>
        {node.meta ? <span className={styles.nodeMeta}>{node.meta}</span> : null}
      </div>

      {node.children?.length ? (
        <div className={styles.children}>
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function RunParentChildTree({ tree }) {
  if (!tree) return null;

  return (
    <div className={styles.tree}>
      <TreeNode node={tree} />
    </div>
  );
}
