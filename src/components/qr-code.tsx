import QRCode from "react-qr-code";

type Props = {
  url: string;
  size?: number;
  className?: string;
};

export function QrCode({ url, size = 128, className }: Props) {
  return (
    <div className={className}>
      <QRCode
        size={size}
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
