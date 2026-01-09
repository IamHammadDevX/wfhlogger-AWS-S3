[Setup]
AppName=Time Tracker
AppVersion=3.0.0
AppPublisher=Vughy Inc
DefaultDirName={autopf}\TimeTracker
DefaultGroupName=Time Tracker
UninstallDisplayIcon={app}\TimeTracker.exe
Compression=lzma2
SolidCompression=yes
OutputDir=C:\Users\hP\Documents\trae_projects\Time_Tracker_System\backend\public\downloads
OutputBaseFilename=TimeTrackerSetup
ArchitecturesInstallIn64BitMode=x64

[Files]
Source: "C:\Users\hP\Documents\trae_projects\Time_Tracker_System\desktop\dist\TimeTracker.exe"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\Time Tracker"; Filename: "{app}\TimeTracker.exe"
Name: "{autodesktop}\Time Tracker"; Filename: "{app}\TimeTracker.exe"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Run]
Filename: "{app}\TimeTracker.exe"; Description: "{cm:LaunchProgram,Time Tracker}"; Flags: nowait postinstall skipifsilent
