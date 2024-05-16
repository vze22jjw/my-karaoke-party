import QRCode from "react-qr-code";

export function QrCode({ url }: { url: string }) {
  return (
    <div className="fixed bottom-1 left-1 bg-white p-3">
      <QRCode
        size={128}
        // style={{ height: "auto", maxWidth: "100%", width: "100%" }}
        value={url} // Create ID
        // viewBox={`0 0 256 256`}
      />
      {/* <a href={joinPartyUrl} target="_blank" rel="noreferrer">
          {joinPartyUrl}
        </a> */}
    </div>
  );
}
