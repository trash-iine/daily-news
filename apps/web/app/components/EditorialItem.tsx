import Link from "next/link";
import type { BaseItem } from "@daily-news/shared";
import { sourceFamily, sourceLabel } from "@/lib/source-family";
import { tagCatClass } from "@/lib/tag-category";
import { fmtAbsTime, fmtTime, hostFromUrl } from "@/lib/format";
import { ScoreBar } from "./ScoreBar";
import { Thumbnail } from "./Thumbnail";

export function EditorialItem({
  item,
  index,
  nowMs,
}: {
  item: BaseItem;
  index: number;
  nowMs: number;
}) {
  const isPaper = item.kind === "paper";
  const fam = sourceFamily(item.source);
  return (
    <article className={`ed-item ${isPaper ? "is-paper" : "is-news"} fam-${fam}`}>
      <div className="ed-rail">
        <div className="ed-index">{String(index).padStart(2, "0")}</div>
        <div className="ed-kind-dot" />
      </div>
      <div className="ed-body">
        <div className="ed-meta">
          <span className="ed-kind">{isPaper ? "論文" : "ニュース"}</span>
          <span className="ed-dot">·</span>
          <span className={`ed-source fam-${fam}`}>{sourceLabel(item.source)}</span>
          <span className="ed-dot">·</span>
          <span className="ed-time" title={fmtAbsTime(item.publishedAt)}>
            {fmtTime(item.publishedAt, new Date(nowMs))}
          </span>
          <span className="ed-spacer" />
          <span className="ed-score">
            <span className="ed-score-num">{item.score}</span>
            <ScoreBar score={item.score} kind={item.kind} />
          </span>
        </div>
        <div className="ed-main">
          <div className="ed-text">
            <h3 className="ed-title">
              <a href={item.url} target="_blank" rel="noreferrer noopener">
                {item.title}
              </a>
            </h3>
            {item.summary && <p className="ed-summary">{item.summary}</p>}
            <div className="ed-foot">
              <span className="ed-host">{hostFromUrl(item.url)}</span>
              {item.tags.length > 0 && (
                <div className="ed-tags">
                  {item.tags.map((t) => (
                    <Link
                      key={t}
                      className={`ed-tag ${tagCatClass(t)}`}
                      href={`/tags/${encodeURIComponent(t)}`}
                    >
                      #{t}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
          <a
            className="ed-thumb-wrap"
            href={item.url}
            target="_blank"
            rel="noreferrer noopener"
            aria-hidden="true"
            tabIndex={-1}
          >
            <Thumbnail
              src={item.thumbnail}
              alt={item.title}
              family={fam}
              isPaper={isPaper}
              className="ed-thumb"
            />
          </a>
        </div>
      </div>
    </article>
  );
}
