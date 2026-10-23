# 一键部署前端到阿里云服务器：本地构建 + scp 上传 dist
# 用法：npm run deploy   （或 powershell -ExecutionPolicy Bypass -File scripts\deploy.ps1）
# 首次使用前：把下面三行改成你自己的服务器信息，并确保服务器上的 nginx 已把站点根目录指向 $DestDir
$ErrorActionPreference = "Stop"

# ===== 服务器配置（改成你的）=====
$ServerUser = "root"                        # SSH 用户名
$ServerHost = "39.96.61.195"                     # 服务器公网 IP（或域名）
$DestDir    = "/www/wwwroot/soccer-system"  # 服务器上前端目录 = nginx 站点根目录
$BaseUrl    = ""                            # 部署在域名/IP 根路径就留空；子路径部署才填（如 "soccer-system"）
# =================================

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $here
Set-Location $root

if ($BaseUrl -ne "" -and $BaseUrl -ne "/") {
    $env:DEPLOY_BASE = $BaseUrl.Trim('/')
}
Write-Host "==> [1/2] 构建生产包..." -ForegroundColor Green
npx vite build
if ($LASTEXITCODE -ne 0) { throw "构建失败，请先解决报错" }
Remove-Item Env:DEPLOY_BASE -ErrorAction SilentlyContinue

Write-Host "==> [2/2] 上传 dist 到 ${ServerUser}@${ServerHost}:${DestDir}" -ForegroundColor Green
# 首次连接会问是否信任主机（输 yes），然后输一次服务器密码
scp -r dist/* "${ServerUser}@${ServerHost}:$DestDir/"

Write-Host "✅ 部署完成，访问 http://39.96.61.195:8083/ 查看最新版本" -ForegroundColor Green
