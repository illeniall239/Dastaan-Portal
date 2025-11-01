export default function FontTest() {
  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold mb-4">Font Test Page</h1>
      
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 mb-2">With font-urdu class:</p>
          <p className="text-4xl font-urdu" dir="rtl" lang="ur">
            داستان
          </p>
          <p className="text-sm text-gray-500 mt-1">Should be Noto Nastaliq Urdu</p>
        </div>

        <div>
          <p className="text-sm text-gray-600 mb-2">With inline style (direct font-family):</p>
          <p 
            className="text-4xl" 
            dir="rtl" 
            lang="ur"
            style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}
          >
            داستان
          </p>
          <p className="text-sm text-gray-500 mt-1">Should be Noto Nastaliq Urdu</p>
        </div>

        <div>
          <p className="text-sm text-gray-600 mb-2">Without any font class (fallback):</p>
          <p className="text-4xl" dir="rtl" lang="ur">
            داستان
          </p>
          <p className="text-sm text-gray-500 mt-1">System default</p>
        </div>

        <div>
          <p className="text-sm text-gray-600 mb-2">With Georgia (serif fallback):</p>
          <p 
            className="text-4xl" 
            dir="rtl" 
            lang="ur"
            style={{ fontFamily: "Georgia, serif" }}
          >
            داستان
          </p>
          <p className="text-sm text-gray-500 mt-1">Should be Georgia</p>
        </div>
      </div>

      <div className="mt-8 p-4 bg-gray-100 rounded">
        <p className="text-sm font-mono">
          Open DevTools → Network tab → Filter by "font" to see if Noto Nastaliq Urdu is loading
        </p>
      </div>
    </div>
  );
}

