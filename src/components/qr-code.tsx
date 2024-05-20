import QRCode from "react-qr-code";

export function QrCode({ url, className }: { url: string; className?: string }) {
  return (
    <div className={className}>
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
