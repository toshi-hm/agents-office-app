import { useLayoutEffect, useRef, useState } from 'react';
import { ArrowDown } from 'lucide-react';
import type { ExecutionLog } from '@agents-office-app/domain';
import { toLogSegments } from '../../lib/view/log-segments.ts';

const BOTTOM_SLACK_PX = 24;

/** Terminal-like output that follows new lines until the reader scrolls up. */
export function LogView({ logs }: { logs: readonly ExecutionLog[] }) {
  const container = useRef<HTMLDivElement>(null);
  const [following, setFollowing] = useState(true);
  const lastKey = logs.at(-1)?.id;

  useLayoutEffect(() => {
    const element = container.current;
    if (element && following) element.scrollTop = element.scrollHeight;
  }, [following, lastKey, logs.length]);

  return (
    <div className="log">
      <div
        ref={container}
        className="log__scroll"
        role="log"
        aria-label="実行ログ"
        tabIndex={0}
        onScroll={(event) => {
          const element = event.currentTarget;
          setFollowing(
            element.scrollHeight - element.scrollTop - element.clientHeight <= BOTTOM_SLACK_PX,
          );
        }}
      >
        {logs.length === 0 ? (
          <p className="log__empty">まだ出力はありません</p>
        ) : (
          <pre className="log__output">
            {toLogSegments(logs).map((segment) => (
              <span key={segment.key} data-stream={segment.stream}>
                {segment.text}
              </span>
            ))}
          </pre>
        )}
      </div>
      {!following && (
        <button type="button" className="log__latest" onClick={() => setFollowing(true)}>
          <ArrowDown size={12} aria-hidden="true" />
          最新へ
        </button>
      )}
    </div>
  );
}
