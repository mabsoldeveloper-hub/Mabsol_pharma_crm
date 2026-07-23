using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Win32;

namespace MabsolSyncAgentGUI
{
    public class MainForm : Form
    {
        [DllImport("user32.dll")]
        private static extern bool SetForegroundWindow(IntPtr hWnd);

        [DllImport("user32.dll")]
        private static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

        [DllImport("user32.dll", CharSet = CharSet.Auto)]
        private static extern int RegisterWindowMessage(string message);

        [DllImport("user32.dll")]
        private static extern bool PostMessage(IntPtr hwnd, int msg, IntPtr wparam, IntPtr lparam);

        private const int SW_RESTORE = 9;
        private static readonly int WM_SHOWME = RegisterWindowMessage("WM_SHOWME_MABSOL_SYNC_AGENT");
        private static Mutex mutex = null;

        private Panel setupPanel;
        private Panel dashboardPanel;

        // Setup Panel Controls
        private TextBox txtSetupLicense;
        private TextBox txtSetupFolder;
        private Button btnSetupBrowse;
        private Button btnSetupSave;
        private Label lblSetupError;

        // Dashboard Panel Controls
        private Label lblHeaderTitle;
        private Label lblHeaderSub;
        private Label lblStatusBadge;
        private TextBox txtDashLicense;
        private Button btnDashUpdateLicense;
        private TextBox txtDashFolder;
        private Button btnDashBrowseFolder;
        private Button btnDashSaveFolder;
        private TextBox txtDashServer;
        private RichTextBox txtLog;
        private Button btnSyncNow;
        private Button btnMinimizeTray;
        private NotifyIcon trayIcon;
        private ContextMenuStrip trayMenu;
        private System.Windows.Forms.Timer statusTimer;

        private string appDataDir;
        private string configPath;
        private string licenseKey = "";
        private string dataDir = @"D:\Data";
        private string serverUrl = "https://phcrm.mabsolinfotech.cloud";

        protected override void WndProc(ref Message m)
        {
            if (m.Msg == WM_SHOWME)
            {
                ShowMe();
            }
            base.WndProc(ref m);
        }

        public void ShowMe()
        {
            if (this.InvokeRequired)
            {
                this.Invoke(new Action(ShowMe));
                return;
            }
            this.Show();
            if (this.WindowState == FormWindowState.Minimized)
            {
                this.WindowState = FormWindowState.Normal;
            }
            this.BringToFront();
            this.Activate();
            try
            {
                ShowWindow(this.Handle, SW_RESTORE);
                SetForegroundWindow(this.Handle);
            }
            catch { }
        }

        public MainForm()
        {
            try
            {
                ServicePointManager.SecurityProtocol = (SecurityProtocolType)3072 | (SecurityProtocolType)768 | SecurityProtocolType.Tls;
                ServicePointManager.ServerCertificateValidationCallback = delegate { return true; };
            }
            catch { }

            InitializeDirectories();
            LoadConfig();
            InitializeUI();
            InitializeTray();

            statusTimer = new System.Windows.Forms.Timer();
            statusTimer.Interval = 5000;
            statusTimer.Tick += StatusTimer_Tick;

            this.Shown += MainForm_Shown;
        }

        private void MainForm_Shown(object sender, EventArgs e)
        {
            try
            {
                ShowMe();
                StartBackgroundEngine();
                statusTimer.Start();

                if (string.IsNullOrEmpty(licenseKey) || !Directory.Exists(dataDir))
                {
                    ShowSetupView();
                }
                else
                {
                    ShowDashboardView();
                    CheckConnection();
                }
            }
            catch (Exception ex)
            {
                LogMessage("[Startup Notice] " + ex.Message);
                ShowSetupView();
            }
        }

        private void InitializeDirectories()
        {
            string appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            appDataDir = Path.Combine(appData, "MabsolSyncAgent");
            Directory.CreateDirectory(appDataDir);
            configPath = Path.Combine(appDataDir, "config.json");
        }

        private void LoadConfig()
        {
            if (File.Exists(configPath))
            {
                try
                {
                    string json = File.ReadAllText(configPath);
                    licenseKey = ExtractJsonValue(json, "licenseKey");
                    dataDir = ExtractJsonValue(json, "dataDir");
                    string sUrl = ExtractJsonValue(json, "serverUrl");
                    if (!string.IsNullOrEmpty(sUrl)) serverUrl = sUrl;
                    if (string.IsNullOrEmpty(dataDir)) dataDir = @"D:\Data";
                }
                catch { }
            }
        }

        private string ExtractJsonValue(string json, string key)
        {
            int idx = json.IndexOf("\"" + key + "\"");
            if (idx == -1) return "";
            int start = json.IndexOf(":", idx);
            if (start == -1) return "";
            int quote1 = json.IndexOf("\"", start);
            if (quote1 == -1) return "";
            int quote2 = json.IndexOf("\"", quote1 + 1);
            if (quote2 == -1) return "";
            return json.Substring(quote1 + 1, quote2 - quote1 - 1).Replace("\\\\", "\\");
        }

        private bool SaveConfig(string key, string dir, string server)
        {
            try
            {
                if (server.StartsWith("MSK-"))
                {
                    if (string.IsNullOrEmpty(key)) key = server;
                    server = "https://phcrm.mabsolinfotech.cloud";
                }
                if (!server.StartsWith("http://") && !server.StartsWith("https://"))
                {
                    server = "https://" + server;
                }
                serverUrl = server.TrimEnd('/');
                licenseKey = key.Trim();
                dataDir = dir.Trim();

                string json = string.Format("{{\n  \"serverUrl\": \"{0}\",\n  \"licenseKey\": \"{1}\",\n  \"dataDir\": \"{2}\",\n  \"syncIntervalMs\": 10000\n}}",
                    serverUrl.Replace("\\", "\\\\"),
                    licenseKey.Replace("\\", "\\\\"),
                    dataDir.Replace("\\", "\\\\"));

                File.WriteAllText(configPath, json);
                
                try
                {
                    using (RegistryKey rk = Registry.CurrentUser.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\Run", true))
                    {
                        if (rk != null)
                        {
                            rk.SetValue("MabsolSyncAgent", "\"" + Application.ExecutablePath + "\"");
                        }
                    }
                }
                catch { }

                LogMessage("[Config] Configuration saved successfully.");
                StartBackgroundEngine();
                return true;
            }
            catch (Exception ex)
            {
                LogMessage("[Config Error] Failed to save config: " + ex.Message);
                return false;
            }
        }

        private void InitializeUI()
        {
            this.Text = "Mabsol Sync Agent Desktop Application";
            this.Size = new Size(640, 580);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.FixedSingle;
            this.MaximizeBox = false;
            this.BackColor = Color.FromArgb(248, 250, 252);
            this.Icon = SystemIcons.Shield;
            this.ShowInTaskbar = true;

            BuildSetupPanel();
            BuildDashboardPanel();

            this.Controls.Add(setupPanel);
            this.Controls.Add(dashboardPanel);
            this.FormClosing += MainForm_FormClosing;
        }

        private void BuildSetupPanel()
        {
            setupPanel = new Panel() { Location = new Point(0, 0), Size = new Size(640, 580), Visible = false, BackColor = Color.FromArgb(248, 250, 252) };

            Panel header = new Panel() { Location = new Point(0, 0), Size = new Size(640, 80), BackColor = Color.FromArgb(15, 23, 42) };
            Label title = new Label() { Text = "Mabsol Sync Agent Setup Wizard", Location = new Point(24, 18), Size = new Size(580, 26), Font = new Font("Segoe UI", 13f, FontStyle.Bold), ForeColor = Color.White };
            Label sub = new Label() { Text = "Connect your local database folder to Mabsol Pharma CRM Cloud", Location = new Point(26, 46), Size = new Size(580, 20), Font = new Font("Segoe UI", 8.5f), ForeColor = Color.FromArgb(148, 163, 184) };
            header.Controls.Add(title);
            header.Controls.Add(sub);

            Label lblKey = new Label() { Text = "1. Enter Company License Key (e.g. MSK-XXXX-XXXX):", Location = new Point(30, 105), Size = new Size(560, 22), Font = new Font("Segoe UI", 9.5f, FontStyle.Bold), ForeColor = Color.FromArgb(30, 41, 59) };
            txtSetupLicense = new TextBox() { Location = new Point(32, 130), Size = new Size(560, 28), Font = new Font("Segoe UI", 10f), Text = licenseKey };

            Label lblFolder = new Label() { Text = "2. Select Local Database Folder (DBF Files Location):", Location = new Point(30, 175), Size = new Size(560, 22), Font = new Font("Segoe UI", 9.5f, FontStyle.Bold), ForeColor = Color.FromArgb(30, 41, 59) };
            txtSetupFolder = new TextBox() { Location = new Point(32, 200), Size = new Size(440, 28), Font = new Font("Segoe UI", 10f), Text = dataDir };
            btnSetupBrowse = new Button() { Text = "Browse...", Location = new Point(482, 199), Size = new Size(110, 30), Font = new Font("Segoe UI", 9f) };
            btnSetupBrowse.Click += (s, e) => {
                using (FolderBrowserDialog fbd = new FolderBrowserDialog())
                {
                    if (Directory.Exists(txtSetupFolder.Text)) fbd.SelectedPath = txtSetupFolder.Text;
                    if (fbd.ShowDialog() == DialogResult.OK) txtSetupFolder.Text = fbd.SelectedPath;
                }
            };

            lblSetupError = new Label() { Text = "", Location = new Point(32, 245), Size = new Size(560, 30), Font = new Font("Segoe UI", 9f, FontStyle.Bold), ForeColor = Color.FromArgb(225, 29, 72) };

            btnSetupSave = new Button() { Text = "Complete Setup & Open Dashboard", Location = new Point(32, 285), Size = new Size(560, 44), Font = new Font("Segoe UI", 10f, FontStyle.Bold), BackColor = Color.FromArgb(37, 99, 235), ForeColor = Color.White, FlatStyle = FlatStyle.Flat };
            btnSetupSave.FlatAppearance.BorderSize = 0;
            btnSetupSave.Click += (s, e) => {
                string k = txtSetupLicense.Text.Trim();
                string f = txtSetupFolder.Text.Trim();
                if (string.IsNullOrEmpty(k)) { lblSetupError.Text = "Please enter your Company License Key."; return; }
                if (string.IsNullOrEmpty(f)) { lblSetupError.Text = "Please select a valid local database folder."; return; }

                if (SaveConfig(k, f, serverUrl))
                {
                    ShowDashboardView();
                    CheckConnection();
                }
            };

            setupPanel.Controls.Add(header);
            setupPanel.Controls.Add(lblKey);
            setupPanel.Controls.Add(txtSetupLicense);
            setupPanel.Controls.Add(lblFolder);
            setupPanel.Controls.Add(txtSetupFolder);
            setupPanel.Controls.Add(btnSetupBrowse);
            setupPanel.Controls.Add(lblSetupError);
            setupPanel.Controls.Add(btnSetupSave);
        }

        private void BuildDashboardPanel()
        {
            dashboardPanel = new Panel() { Location = new Point(0, 0), Size = new Size(640, 580), Visible = false, BackColor = Color.FromArgb(248, 250, 252) };

            Panel header = new Panel() { Location = new Point(0, 0), Size = new Size(640, 75), BackColor = Color.FromArgb(15, 23, 42) };
            lblHeaderTitle = new Label() { Text = "Mabsol Sync Agent Dashboard", Location = new Point(20, 15), Size = new Size(350, 24), Font = new Font("Segoe UI", 12.5f, FontStyle.Bold), ForeColor = Color.White };
            lblHeaderSub = new Label() { Text = "Real-time 24/7 Desktop Database Synchronization", Location = new Point(22, 42), Size = new Size(350, 18), Font = new Font("Segoe UI", 8.5f), ForeColor = Color.FromArgb(148, 163, 184) };

            lblStatusBadge = new Label() { Text = "Checking...", Location = new Point(440, 20), Size = new Size(160, 32), Font = new Font("Segoe UI", 9f, FontStyle.Bold), ForeColor = Color.White, BackColor = Color.FromArgb(71, 85, 105), TextAlign = ContentAlignment.MiddleCenter };

            header.Controls.Add(lblHeaderTitle);
            header.Controls.Add(lblHeaderSub);
            header.Controls.Add(lblStatusBadge);

            Label lblKey = new Label() { Text = "1. Active Company License Key", Location = new Point(20, 90), Size = new Size(580, 20), Font = new Font("Segoe UI", 9.5f, FontStyle.Bold), ForeColor = Color.FromArgb(30, 41, 59) };
            txtDashLicense = new TextBox() { Location = new Point(22, 114), Size = new Size(450, 26), Font = new Font("Segoe UI", 10f), Text = licenseKey };
            btnDashUpdateLicense = new Button() { Text = "Update Key", Location = new Point(482, 112), Size = new Size(118, 30), Font = new Font("Segoe UI", 9f, FontStyle.Bold), BackColor = Color.FromArgb(37, 99, 235), ForeColor = Color.White, FlatStyle = FlatStyle.Flat };
            btnDashUpdateLicense.FlatAppearance.BorderSize = 0;
            btnDashUpdateLicense.Click += (s, e) => {
                string k = txtDashLicense.Text.Trim();
                if (!string.IsNullOrEmpty(k)) { SaveConfig(k, dataDir, serverUrl); }
            };

            Label lblFolder = new Label() { Text = "2. Local Database Folder Path (Drive & Directory)", Location = new Point(20, 155), Size = new Size(580, 20), Font = new Font("Segoe UI", 9.5f, FontStyle.Bold), ForeColor = Color.FromArgb(30, 41, 59) };
            txtDashFolder = new TextBox() { Location = new Point(22, 178), Size = new Size(350, 26), Font = new Font("Segoe UI", 9.5f), Text = dataDir };
            btnDashBrowseFolder = new Button() { Text = "Browse...", Location = new Point(380, 177), Size = new Size(90, 28), Font = new Font("Segoe UI", 9f) };
            btnDashBrowseFolder.Click += (s, e) => {
                using (FolderBrowserDialog fbd = new FolderBrowserDialog())
                {
                    if (Directory.Exists(dataDir)) fbd.SelectedPath = dataDir;
                    if (fbd.ShowDialog() == DialogResult.OK) { txtDashFolder.Text = fbd.SelectedPath; }
                }
            };
            btnDashSaveFolder = new Button() { Text = "Save Folder", Location = new Point(482, 177), Size = new Size(118, 28), Font = new Font("Segoe UI", 9f, FontStyle.Bold), BackColor = Color.FromArgb(16, 185, 129), ForeColor = Color.White, FlatStyle = FlatStyle.Flat };
            btnDashSaveFolder.FlatAppearance.BorderSize = 0;
            btnDashSaveFolder.Click += (s, e) => {
                string f = txtDashFolder.Text.Trim();
                if (!string.IsNullOrEmpty(f)) { SaveConfig(licenseKey, f, serverUrl); }
            };

            Label lblSrv = new Label() { Text = "3. Cloud Server URL:", Location = new Point(20, 218), Size = new Size(130, 20), Font = new Font("Segoe UI", 9f, FontStyle.Bold), ForeColor = Color.FromArgb(71, 85, 105) };
            txtDashServer = new TextBox() { Location = new Point(145, 215), Size = new Size(455, 24), Font = new Font("Segoe UI", 9f), Text = serverUrl };
            txtDashServer.LostFocus += (s, e) => { SaveConfig(licenseKey, dataDir, txtDashServer.Text.Trim()); };

            Label lblLog = new Label() { Text = "Live Sync Activity & Diagnostics Log:", Location = new Point(20, 252), Size = new Size(300, 20), Font = new Font("Segoe UI", 9f, FontStyle.Bold), ForeColor = Color.FromArgb(30, 41, 59) };
            txtLog = new RichTextBox() { Location = new Point(22, 275), Size = new Size(578, 185), Font = new Font("Consolas", 9f), ReadOnly = true, BackColor = Color.FromArgb(15, 23, 42), ForeColor = Color.FromArgb(226, 232, 240) };

            btnSyncNow = new Button() { Text = "⚡ Force Sync Now", Location = new Point(22, 475), Size = new Size(160, 36), Font = new Font("Segoe UI", 9.5f, FontStyle.Bold), BackColor = Color.FromArgb(79, 70, 229), ForeColor = Color.White, FlatStyle = FlatStyle.Flat };
            btnSyncNow.FlatAppearance.BorderSize = 0;
            btnSyncNow.Click += (s, e) => { LogMessage("[Sync] Manual sync requested."); CheckConnection(); };

            btnMinimizeTray = new Button() { Text = "Minimize to Tray", Location = new Point(430, 475), Size = new Size(170, 36), Font = new Font("Segoe UI", 9f) };
            btnMinimizeTray.Click += (s, e) => { this.Hide(); trayIcon.ShowBalloonTip(2000, "Mabsol Sync Agent", "App running in background system tray.", ToolTipIcon.Info); };

            dashboardPanel.Controls.Add(header);
            dashboardPanel.Controls.Add(lblKey);
            dashboardPanel.Controls.Add(txtDashLicense);
            dashboardPanel.Controls.Add(btnDashUpdateLicense);
            dashboardPanel.Controls.Add(lblFolder);
            dashboardPanel.Controls.Add(txtDashFolder);
            dashboardPanel.Controls.Add(btnDashBrowseFolder);
            dashboardPanel.Controls.Add(btnDashSaveFolder);
            dashboardPanel.Controls.Add(lblSrv);
            dashboardPanel.Controls.Add(txtDashServer);
            dashboardPanel.Controls.Add(lblLog);
            dashboardPanel.Controls.Add(txtLog);
            dashboardPanel.Controls.Add(btnSyncNow);
            dashboardPanel.Controls.Add(btnMinimizeTray);
        }

        private void ShowSetupView()
        {
            txtSetupLicense.Text = licenseKey;
            txtSetupFolder.Text = dataDir;
            setupPanel.Visible = true;
            dashboardPanel.Visible = false;
        }

        private void ShowDashboardView()
        {
            txtDashLicense.Text = licenseKey;
            txtDashFolder.Text = dataDir;
            txtDashServer.Text = serverUrl;
            setupPanel.Visible = false;
            dashboardPanel.Visible = true;
        }

        private void InitializeTray()
        {
            trayMenu = new ContextMenuStrip();
            trayMenu.Items.Add("Open Dashboard Window", null, (s, e) => ShowMe());
            trayMenu.Items.Add("Force Sync Now", null, (s, e) => CheckConnection());
            trayMenu.Items.Add("-");
            trayMenu.Items.Add("Exit Mabsol Sync Agent", null, (s, e) => { trayIcon.Visible = false; Application.ExitThread(); });

            trayIcon = new NotifyIcon();
            trayIcon.Text = "Mabsol Sync Agent";
            trayIcon.Icon = SystemIcons.Shield;
            trayIcon.ContextMenuStrip = trayMenu;
            trayIcon.Visible = true;
            trayIcon.DoubleClick += (s, e) => ShowMe();
        }

        private void StatusTimer_Tick(object sender, EventArgs e)
        {
            if (dashboardPanel.Visible)
            {
                CheckConnection();
            }
        }

        private void CheckConnection()
        {
            try
            {
                if (string.IsNullOrEmpty(licenseKey))
                {
                    UpdateBadge("NO LICENSE KEY", Color.FromArgb(217, 119, 6));
                    LogMessage("[Status] License key is missing.");
                    return;
                }

                if (!Directory.Exists(dataDir))
                {
                    UpdateBadge("FOLDER NOT FOUND", Color.FromArgb(225, 29, 72));
                    LogMessage("[Status] Local folder not found: " + dataDir);
                    return;
                }

                string cleanServer = (!string.IsNullOrEmpty(serverUrl) ? serverUrl : "https://phcrm.mabsolinfotech.cloud").TrimEnd('/');
                string url = cleanServer + "/api/sync-agent/heartbeat";
                HttpWebRequest req = (HttpWebRequest)WebRequest.Create(url);
                req.Method = "POST";
                req.ContentType = "application/json";
                req.Headers["Authorization"] = "Bearer " + licenseKey;
                req.Timeout = 5000;

                string body = string.Format("{{\"workerId\":\"{0}-{1}\",\"hostname\":\"{0}\",\"dataDir\":\"{2}\",\"agentVersion\":\"1.0.0\",\"status\":\"online\"}}",
                    Environment.MachineName, licenseKey, dataDir.Replace("\\", "\\\\"));

                byte[] bytes = Encoding.UTF8.GetBytes(body);
                req.ContentLength = bytes.Length;
                using (Stream os = req.GetRequestStream())
                {
                    os.Write(bytes, 0, bytes.Length);
                }

                using (HttpWebResponse resp = (HttpWebResponse)req.GetResponse())
                {
                    if (resp.StatusCode == HttpStatusCode.OK)
                    {
                        UpdateBadge("🟢 ONLINE", Color.FromArgb(16, 185, 129));
                        LogMessage("[Status] Connected to Cloud Server. Heartbeat OK (" + DateTime.Now.ToLongTimeString() + ").");
                    }
                    else
                    {
                        UpdateBadge("🔴 OFFLINE", Color.FromArgb(225, 29, 72));
                        LogMessage("[Status] Server status code: " + (int)resp.StatusCode);
                    }
                }
            }
            catch (WebException webEx)
            {
                HttpWebResponse errResp = webEx.Response as HttpWebResponse;
                if (errResp != null)
                {
                    if (errResp.StatusCode == HttpStatusCode.Unauthorized)
                    {
                        UpdateBadge("INVALID KEY", Color.FromArgb(217, 119, 6));
                        LogMessage("[Status] Authentication error: Invalid License Key. Please check key on CRM Dashboard.");
                    }
                    else
                    {
                        UpdateBadge("🔴 OFFLINE", Color.FromArgb(225, 29, 72));
                        LogMessage("[Status] Server returned HTTP " + (int)errResp.StatusCode + " (" + errResp.StatusDescription + ")");
                    }
                }
                else
                {
                    UpdateBadge("🔴 DISCONNECTED", Color.FromArgb(225, 29, 72));
                    LogMessage("[Status] Network connection error: " + webEx.Message);
                }
            }
            catch (Exception ex)
            {
                UpdateBadge("🔴 DISCONNECTED", Color.FromArgb(225, 29, 72));
                LogMessage("[Status] Connection check: " + ex.Message);
            }
        }

        private void UpdateBadge(string text, Color bg)
        {
            if (this.InvokeRequired)
            {
                this.Invoke(new Action(() => UpdateBadge(text, bg)));
                return;
            }
            lblStatusBadge.Text = text;
            lblStatusBadge.BackColor = bg;
        }

        private void LogMessage(string msg)
        {
            if (this.InvokeRequired)
            {
                this.Invoke(new Action(() => LogMessage(msg)));
                return;
            }
            txtLog.AppendText(string.Format("[{0}] {1}\n", DateTime.Now.ToString("HH:mm:ss"), msg));
            txtLog.SelectionStart = txtLog.Text.Length;
            txtLog.ScrollToCaret();
        }

        private void StartBackgroundEngine()
        {
            try
            {
                Process[] procs = Process.GetProcessesByName("mabsolsyncagent");
                if (procs.Length == 0)
                {
                    string baseDir = AppDomain.CurrentDomain.BaseDirectory;
                    string agentExe = Path.Combine(baseDir, "mabsolsyncagent.exe");
                    if (!File.Exists(agentExe))
                    {
                        string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                        agentExe = Path.Combine(localAppData, "MabsolSyncAgent", "mabsolsyncagent.exe");
                    }

                    if (File.Exists(agentExe))
                    {
                        ProcessStartInfo psi = new ProcessStartInfo()
                        {
                            FileName = agentExe,
                            CreateNoWindow = true,
                            UseShellExecute = false,
                            WindowStyle = ProcessWindowStyle.Hidden
                        };
                        Process.Start(psi);
                        LogMessage("[Engine] Background node engine launched.");
                    }
                }
            }
            catch (Exception ex)
            {
                LogMessage("[Engine Error] Could not start background node engine: " + ex.Message);
            }
        }

        private void MainForm_FormClosing(object sender, FormClosingEventArgs e)
        {
            if (e.CloseReason == CloseReason.UserClosing)
            {
                DialogResult res = MessageBox.Show(
                    "Do you want to minimize Mabsol Sync Agent to the system tray?\n\n- Click YES to keep syncing 24/7 in background.\n- Click NO to close the application completely.",
                    "Mabsol Sync Agent",
                    MessageBoxButtons.YesNoCancel,
                    MessageBoxIcon.Question);

                if (res == DialogResult.Yes)
                {
                    e.Cancel = true;
                    this.Hide();
                    trayIcon.ShowBalloonTip(2000, "Mabsol Sync Agent", "App running 24/7 in system tray.", ToolTipIcon.Info);
                }
                else if (res == DialogResult.Cancel)
                {
                    e.Cancel = true;
                }
                else
                {
                    trayIcon.Visible = false;
                }
            }
        }

        [STAThread]
        public static void Main()
        {
            bool createdNew;
            mutex = new Mutex(true, "MabsolSyncAgentSingleInstanceMutex_v1", out createdNew);

            if (!createdNew)
            {
                // Send WM_SHOWME message to existing running instance to restore window & bring to front!
                PostMessage((IntPtr)0xffff, WM_SHOWME, IntPtr.Zero, IntPtr.Zero);
                return;
            }

            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.SetUnhandledExceptionMode(UnhandledExceptionMode.CatchException);
            
            Application.ThreadException += (s, e) => {
                MessageBox.Show("Mabsol Sync Agent Notice: " + e.Exception.Message, "Sync Agent Notice", MessageBoxButtons.OK, MessageBoxIcon.Information);
            };
            AppDomain.CurrentDomain.UnhandledException += (s, e) => {
                Exception ex = e.ExceptionObject as Exception;
                MessageBox.Show("Mabsol Sync Agent Notice: " + (ex != null ? ex.Message : "Unexpected error"), "Sync Agent Notice", MessageBoxButtons.OK, MessageBoxIcon.Information);
            };

            Application.Run(new MainForm());
            GC.KeepAlive(mutex);
        }
    }
}
