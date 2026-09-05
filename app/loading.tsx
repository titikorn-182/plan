export default function Loading() {
  return (
    <main className="min-h-screen bg-[#f7f5f2] lg:pl-[84px]">
      <div className="h-[92px] animate-pulse border-b border-stone-200 bg-white" />
      <div className="space-y-5 p-5 lg:p-8">
        <div className="h-24 animate-pulse border border-stone-200 bg-white" />
        <div className="h-[520px] animate-pulse border border-stone-200 bg-white" />
      </div>
    </main>
  );
}
