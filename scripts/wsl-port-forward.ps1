$wslIp = (wsl -d podman-machine-default ip -4 addr show eth0 | Select-String -Pattern 'inet (\d+\.\d+\.\d+\.\d+)' | ForEach-Object { $_.Matches.Groups[1].Value })
if (-not $wslIp) {
    Write-Error "Could not determine Podman WSL IP"
    exit 1
}

$csharpCode = @"
using System;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Threading.Tasks;

public class PodmanPortProxy {
    public static void Start(string remoteHost, int remotePort, int localPort) {
        var listener = new TcpListener(IPAddress.Loopback, localPort);
        listener.Server.SetSocketOption(SocketOptionLevel.Socket, SocketOptionName.ReuseAddress, true);
        listener.Start();
        while (true) {
            var client = listener.AcceptTcpClient();
            Task.Run(async () => {
                using (client)
                using (var remote = new TcpClient()) {
                    try {
                        await remote.ConnectAsync(remoteHost, remotePort);
                        using (var localStream = client.GetStream())
                        using (var remoteStream = remote.GetStream()) {
                            var t1 = localStream.CopyToAsync(remoteStream);
                            var t2 = remoteStream.CopyToAsync(localStream);
                            await Task.WhenAny(t1, t2);
                        }
                    } catch {}
                }
            });
        }
    }
}
"@

Add-Type -TypeDefinition $csharpCode -Language CSharp
Write-Host "Forwarding 127.0.0.1:3000 -> $wslIp:3000..."
[PodmanPortProxy]::Start($wslIp, 3000, 3000)
