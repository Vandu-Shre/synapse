import RoomClient from "./RoomClient";

export default async function RoomPage({
  params,
}: {
  params: { roomId: string };
}) {
  const resolved = await params;
  return <RoomClient roomId={resolved.roomId} />;
}
