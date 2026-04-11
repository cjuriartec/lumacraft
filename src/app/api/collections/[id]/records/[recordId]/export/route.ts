import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: {
        code: "DOCUMENT_EXPORT_REMOVED",
        message:
          "Direct record export was removed. Open the persisted document with the eye action and download PDF from there.",
      },
    },
    { status: 410 },
  );
}
