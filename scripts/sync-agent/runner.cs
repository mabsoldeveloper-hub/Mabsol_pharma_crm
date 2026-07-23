using System;
using System.Diagnostics;
using System.IO;

namespace MabsolRunner
{
    class Program
    {
        static void Main()
        {
            string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            string exePath = Path.Combine(localAppData, "MabsolSyncAgent", "mabsolsyncagent.exe");

            if (!File.Exists(exePath))
            {
                string baseDir = AppDomain.CurrentDomain.BaseDirectory;
                exePath = Path.Combine(baseDir, "mabsolsyncagent.exe");
            }

            if (File.Exists(exePath))
            {
                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = exePath;
                psi.CreateNoWindow = true;
                psi.UseShellExecute = false;
                psi.WindowStyle = ProcessWindowStyle.Hidden;

                try
                {
                    Process.Start(psi);
                }
                catch { }
            }
        }
    }
}
