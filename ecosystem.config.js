module.exports = {
  apps: [
    // Next.js Web Application (includes Direct Server DBF Sync)
    {
      name: "mabsol-crm",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      instances: "max",           // Runs on all CPU cores (Cluster mode)
      exec_mode: "cluster",
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
      }
    }
  ]
};
