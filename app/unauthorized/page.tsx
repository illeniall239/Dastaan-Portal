import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center">
      <h1 className="text-4xl font-bold mb-4">Unauthorized</h1>
      <p className="text-lg mb-8">You do not have permission to view this page.</p>
      <Link href="/dashboard" className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700">
        Go to Dashboard
      </Link>
    </div>
  );
}
