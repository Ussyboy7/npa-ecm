"use client";

import { useParams } from 'next/navigation';

export default function ArchivedCorrespondencePage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Archived Correspondence</h1>
      <p>Correspondence ID: {id}</p>
    </div>
  );
}