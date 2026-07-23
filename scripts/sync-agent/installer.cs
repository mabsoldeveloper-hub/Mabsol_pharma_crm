using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Windows.Forms;
using Microsoft.Win32;

namespace MabsolSyncAgentInstaller
{
    public class InstallerForm : Form
    {
        private Label lblTitle;
        private Label lblSub;
        private Label lblLicense;
        private TextBox txtLicense;
        private Label lblFolder;
        private TextBox txtFolder;
        private Button btnBrowse;
        private Button btnInstall;
        private Button btnCancel;
        private ProgressBar progressBar;

        public InstallerForm()
        {
            this.Text = "Mabsol Sync Agent Setup";
            this.Size = new Size(500, 380);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.MinimizeBox = false;
            this.BackColor = Color.FromArgb(245, 247, 250);

            lblTitle = new Label() { Text = "Mabsol Sync Agent Setup Wizard", Location = new Point(20, 20), Size = new Size(440, 30), Font = new Font("Segoe UI", 13, FontStyle.Bold), ForeColor = Color.FromArgb(15, 23, 42) };
            lblSub = new Label() { Text = "Install Mabsol 24/7 Database Synchronization Agent on your Windows PC", Location = new Point(22, 50), Size = new Size(440, 20), Font = new Font("Segoe UI", 8.5f, FontStyle.Regular), ForeColor = Color.FromArgb(100, 116, 139) };

            lblLicense = new Label() { Text = "Company License Key (e.g. MSK-XXXX-XXXX):", Location = new Point(22, 85), Size = new Size(440, 20), Font = new Font("Segoe UI", 9, FontStyle.Bold) };
            txtLicense = new TextBox() { Location = new Point(24, 108), Size = new Size(430, 25), Font = new Font("Segoe UI", 9.5f) };

            lblFolder = new Label() { Text = "Local Database Folder Path (e.g. D:\\Data):", Location = new Point(22, 145), Size = new Size(440, 20), Font = new Font("Segoe UI", 9, FontStyle.Bold) };
            txtFolder = new TextBox() { Location = new Point(24, 168), Size = new Size(330, 25), Font = new Font("Segoe UI", 9.5f), Text = @"D:\Data" };

            btnBrowse = new Button() { Text = "Browse...", Location = new Point(362, 166), Size = new Size(92, 28), Font = new Font("Segoe UI", 9) };
            btnBrowse.Click += BtnBrowse_Click;

            progressBar = new ProgressBar() { Location = new Point(24, 215), Size = new Size(430, 20), Visible = false };

            btnInstall = new Button() { Text = "Install & Start Sync", Location = new Point(200, 270), Size = new Size(150, 36), Font = new Font("Segoe UI", 9.5f, FontStyle.Bold), BackColor = Color.FromArgb(37, 99, 235), ForeColor = Color.White, FlatStyle = FlatStyle.Flat };
            btnInstall.FlatAppearance.BorderSize = 0;
            btnInstall.Click += BtnInstall_Click;

            btnCancel = new Button() { Text = "Cancel", Location = new Point(362, 270), Size = new Size(92, 36), Font = new Font("Segoe UI", 9.5f) };
            btnCancel.Click += (s, e) => this.Close();

            this.Controls.Add(lblTitle);
            this.Controls.Add(lblSub);
            this.Controls.Add(lblLicense);
            this.Controls.Add(txtLicense);
            this.Controls.Add(lblFolder);
            this.Controls.Add(txtFolder);
            this.Controls.Add(btnBrowse);
            this.Controls.Add(progressBar);
            this.Controls.Add(btnInstall);
            this.Controls.Add(btnCancel);
        }

        private void BtnBrowse_Click(object sender, EventArgs e)
        {
            using (FolderBrowserDialog fbd = new FolderBrowserDialog())
            {
                if (fbd.ShowDialog() == DialogResult.OK)
                {
                    txtFolder.Text = fbd.SelectedPath;
                }
            }
        }

        private void BtnInstall_Click(object sender, EventArgs e)
        {
            string license = txtLicense.Text.Trim();
            string folder = txtFolder.Text.Trim();

            if (string.IsNullOrEmpty(license))
            {
                MessageBox.Show("Please enter your Company License Key.", "Validation Error", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            btnInstall.Enabled = false;
            btnCancel.Enabled = false;
            progressBar.Visible = true;
            progressBar.Value = 20;

            try
            {
                // Force kill running instances via taskkill command
                KillExistingProcesses();

                progressBar.Value = 40;

                string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                string installDir = Path.Combine(localAppData, "MabsolSyncAgent");
                Directory.CreateDirectory(installDir);

                string appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
                string configDir = Path.Combine(appData, "MabsolSyncAgent");
                Directory.CreateDirectory(configDir);

                // Write config.json
                string configPath = Path.Combine(configDir, "config.json");
                string json = string.Format("{{\n  \"serverUrl\": \"https://phcrm.mabsolinfotech.cloud\",\n  \"licenseKey\": \"{0}\",\n  \"dataDir\": \"{1}\",\n  \"syncIntervalMs\": 10000\n}}", license.Replace("\\", "\\\\"), folder.Replace("\\", "\\\\"));
                File.WriteAllText(configPath, json);

                progressBar.Value = 60;

                string currentExeDir = AppDomain.CurrentDomain.BaseDirectory;
                string sourceAgent = Path.Combine(currentExeDir, "mabsolsyncagent.exe");
                string targetAgent = Path.Combine(installDir, "mabsolsyncagent.exe");
                
                string sourceRunner = Path.Combine(currentExeDir, "MabsolSyncAgent.exe");
                if (!File.Exists(sourceRunner)) sourceRunner = Path.Combine(currentExeDir, "MabsolSyncAgentApp.exe");
                if (!File.Exists(sourceRunner)) sourceRunner = Application.ExecutablePath;

                string targetRunner = Path.Combine(installDir, "MabsolSyncAgent.exe");

                // Safely copy files
                if (File.Exists(sourceAgent)) TryCopyFile(sourceAgent, targetAgent);
                TryCopyFile(sourceRunner, targetRunner);

                // Add to Windows Registry Startup
                try
                {
                    using (RegistryKey rk = Registry.CurrentUser.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\Run", true))
                    {
                        if (rk != null)
                        {
                            rk.SetValue("MabsolSyncAgent", "\"" + targetRunner + "\"");
                        }
                    }
                }
                catch { }

                // Create Desktop Shortcut
                CreateShortcut("Mabsol Sync Agent", targetRunner);

                progressBar.Value = 100;
                MessageBox.Show("Mabsol Sync Agent has been installed successfully!\nThe Desktop Control Panel software is now opening.", "Installation Complete", MessageBoxButtons.OK, MessageBoxIcon.Information);

                // Start Desktop Control Panel application
                try
                {
                    ProcessStartInfo psiStart = new ProcessStartInfo()
                    {
                        FileName = targetRunner,
                        UseShellExecute = true
                    };
                    Process.Start(psiStart);
                }
                catch { }

                this.Close();
            }
            catch (Exception ex)
            {
                MessageBox.Show("Installation notice: " + ex.Message, "Notice", MessageBoxButtons.OK, MessageBoxIcon.Information);
                btnInstall.Enabled = true;
                btnCancel.Enabled = true;
            }
        }

        private void KillExistingProcesses()
        {
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo("taskkill", "/F /IM mabsolsyncagent.exe /T")
                {
                    CreateNoWindow = true,
                    UseShellExecute = false
                };
                Process p = Process.Start(psi);
                if (p != null) p.WaitForExit(1500);
            }
            catch { }

            try
            {
                ProcessStartInfo psi = new ProcessStartInfo("taskkill", "/F /IM MabsolSyncAgent.exe /T")
                {
                    CreateNoWindow = true,
                    UseShellExecute = false
                };
                Process p = Process.Start(psi);
                if (p != null) p.WaitForExit(1500);
            }
            catch { }

            System.Threading.Thread.Sleep(500);
        }

        private void TryCopyFile(string src, string dest)
        {
            if (!File.Exists(src)) return;
            try
            {
                if (File.Exists(dest))
                {
                    try { File.Delete(dest); } catch { }
                }
                File.Copy(src, dest, true);
            }
            catch
            {
                // If destination file is locked but already exists from previous installation, ignore copy error
            }
        }

        private void CreateShortcut(string name, string targetPath)
        {
            try
            {
                string desktop = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                string shortcutPath = Path.Combine(desktop, name + ".url");
                using (StreamWriter writer = new StreamWriter(shortcutPath))
                {
                    writer.WriteLine("[InternetShortcut]");
                    writer.WriteLine("URL=file:///" + targetPath.Replace('\\', '/'));
                    writer.WriteLine("IconIndex=0");
                    writer.WriteLine("IconFile=" + targetPath.Replace('\\', '/'));
                }
            }
            catch { }
        }

        [STAThread]
        public static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new InstallerForm());
        }
    }
}
