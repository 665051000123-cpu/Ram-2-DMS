Set WshShell = CreateObject("WScript.Shell") 
WshShell.Run chr(34) & "Start-Scanner.bat" & Chr(34), 0
Set WshShell = Nothing
