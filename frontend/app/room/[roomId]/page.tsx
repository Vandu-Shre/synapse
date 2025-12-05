async function RoomPage({ params }: { params: { roomId: string } }) {
    const resolvedParams = await params;
    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100vh",
                gap: "12px",
            }}
        >
            <h1>Room: {resolvedParams.roomId}</h1>
        </div>
    )
}

export default RoomPage;