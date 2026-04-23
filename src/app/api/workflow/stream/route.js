import { buildWorkflowSnapshot } from '@/lib/workflowBff';
import { getBrandById, listKnowledgeDocuments, recommendSkillsForBrand } from '@/lib/brandModelingService';

export const dynamic = 'force-dynamic';

async function buildSnapshot() {
  const snapshot = await buildWorkflowSnapshot();
  const [brand, documents] = await Promise.all([
    getBrandById('brand_default'),
    listKnowledgeDocuments('brand_default'),
  ]);
  const skills = recommendSkillsForBrand(brand, documents);
  return {
    type: 'snapshot',
    serverTime: new Date().toISOString(),
    summary: snapshot.summary,
    opsBoard: snapshot.opsBoard,
    artifacts: snapshot.artifacts,
    artifactSummary: snapshot.artifactSummary,
    queue: snapshot.queue,
    playbooks: snapshot.playbooks,
    events: snapshot.events,
    referrals: snapshot.referrals,
    runs: snapshot.runs,
    stats: {
      activeRuns: snapshot.runs.filter((item) => item.status !== 'completed' && item.status !== 'cancelled').length,
      pausedForApproval: snapshot.runs.filter((item) => item.status === 'paused_for_approval').length,
    },
    namedEvents: [
      {
        name: 'analytics.snapshot.ready',
        data: {
          pendingApprovals: snapshot.summary.pendingApprovals,
          activeRuns: snapshot.summary.activeRuns,
          artifacts: snapshot.artifactSummary.total,
        },
      },
      {
        name: 'event.attendance.updated',
        data: {
          events: snapshot.events.map((event) => ({
            id: event.id,
            checkedIn: event.liveCheckedIn || 0,
            attendanceRate: event.liveAttendanceRate || '0%',
          })),
        },
      },
      {
        name: 'playbook.ready',
        data: {
          playbookId: snapshot.playbooks.find((item) => item.status === 'published' || item.status === 'recommended')?.id || null,
          releaseRef: snapshot.artifacts.find((item) => item.type === 'playbook_release')?.ref || null,
        },
      },
      {
        name: 'asset.bundle.ready',
        data: {
          referralAssetRef: snapshot.referrals.flatMap((item) => item.assetJobs || []).find((job) => job.artifactRef)?.artifactRef || null,
          artifactCount: snapshot.artifacts.filter((item) => item.type === 'referral_settlement' || item.type === 'playbook_release').length,
        },
      },
      {
        name: 'brand.facts.ready',
        data: {
          brandId: brand.id,
          brandName: brand.name,
          knowledgeDocCount: documents.length,
          missingContextCount: (brand.missingContext || []).length,
        },
      },
      {
        name: 'brand.ingest.completed',
        data: {
          brandId: brand.id,
          sourceCount: (brand.sourceSummary || []).length,
          latestDocument: documents[0]?.name || null,
        },
      },
      {
        name: 'skill.activated',
        data: {
          recommendedCount: skills.recommended.length,
          topSkillId: skills.recommended[0]?.id || null,
        },
      },
    ],
  };
}

function encodeSse(data, eventName) {
  const eventLine = eventName ? `event: ${eventName}\n` : '';
  return `${eventLine}data: ${JSON.stringify(data)}\n\n`;
}

export async function GET() {
  let interval;

  const stream = new ReadableStream({
    async start(controller) {
      const pushSnapshot = async () => {
        const snapshot = await buildSnapshot();
        controller.enqueue(new TextEncoder().encode(encodeSse(snapshot)));
        (snapshot.namedEvents || []).forEach((item) => {
          controller.enqueue(new TextEncoder().encode(encodeSse(item.data, item.name)));
        });
      };

      await pushSnapshot();

      interval = setInterval(() => {
        pushSnapshot()
          .catch((error) => {
            console.error('Failed to build workflow stream snapshot:', error);
          });
      }, 12000);
    },
    cancel() {
      if (interval) clearInterval(interval);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
