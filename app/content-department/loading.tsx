export default function ContentDepartmentLoading() {
  return (
    <div className="space-y-4">
      {/* Row A: Hero + Coverage */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 rounded-[28px] bg-gradient-to-br from-[#5B4BFF]/20 to-[#FF6B4A]/20 h-[300px] animate-pulse" />
        <div className="w-full md:w-[400px] rounded-[28px] bg-white h-[300px] animate-pulse" />
      </div>

      {/* Row B: 4 Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-[24px] bg-white p-[22px] h-[158px] animate-pulse">
            <div className="h-3 w-20 bg-gray-100 rounded" />
            <div className="h-10 w-14 bg-gray-100 rounded mt-16" />
          </div>
        ))}
      </div>

      {/* Row C: Pipeline + Genre */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 rounded-[28px] bg-white h-[320px] animate-pulse" />
        <div className="w-full md:w-[400px] rounded-[28px] bg-white h-[320px] animate-pulse" />
      </div>

      {/* Row D: 3 tiles */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 rounded-[28px] bg-white h-[372px] animate-pulse" />
        <div className="w-full md:w-[340px] rounded-[28px] bg-[#17171F]/10 h-[372px] animate-pulse" />
        <div className="w-full md:w-[230px] rounded-[28px] bg-white h-[372px] animate-pulse" />
      </div>
    </div>
  );
}
