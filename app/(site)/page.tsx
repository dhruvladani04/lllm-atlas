export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-xl font-medium">LLM Atlas</h1>
      <p className="mt-4 max-w-[66ch] text-base text-ink-mute">
        Every other leaderboard tells you a model scored 92 on a benchmark. This one also
        tells you whether that benchmark still means anything and who reported the number.
      </p>
      <p className="mt-8 max-w-[66ch] text-sm text-ink-mute">
        Nothing is published yet. The leaderboard, the benchmark mirror and the evals
        guides arrive in later milestones; this page is a placeholder so the skeleton can
        be deployed and checked.
      </p>
    </main>
  );
}
