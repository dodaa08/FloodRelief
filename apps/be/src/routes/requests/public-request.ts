import type { Request as RequestModel, RequestPhoto } from "@repo/db";

export type RequestWithPhotos = RequestModel & { photos?: RequestPhoto[] };

// contactPhone is the affected person's number. It is exposed to the request's
// owner and to approved responders; nobody else ever sees it.
export function publicRequest(
  request: RequestWithPhotos,
  options: { viewerId?: string; includeContact?: boolean } = {},
) {
  const { contactPhone, ...rest } = request;
  const include = options.includeContact === true || request.requesterId === options.viewerId;
  return {
    ...rest,
    contactPhone: include ? contactPhone : undefined,
  };
}
