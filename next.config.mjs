/** @type {import('next').NextConfig} */
const nextConfig = {
  // Single folder deploy for Windows Server (copy `.next/static` + `public` after build; see scripts/build-windows-server.ps1)
  output: "standalone",
};

export default nextConfig;
