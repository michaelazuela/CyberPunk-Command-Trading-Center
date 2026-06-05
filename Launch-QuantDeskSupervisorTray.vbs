Option Explicit

Dim shell
Dim fso
Dim scriptDir
Dim powershell
Dim trayScript
Dim command

Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
powershell = shell.ExpandEnvironmentStrings("%SystemRoot%") & "\System32\WindowsPowerShell\v1.0\powershell.exe"
trayScript = scriptDir & "\QuantDeskSupervisorTray.ps1"

command = """" & powershell & """ -NoProfile -ExecutionPolicy Bypass -STA -WindowStyle Hidden -File """ & trayScript & """"
shell.Run command, 0, False
