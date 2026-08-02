Set WshShell = CreateObject("WScript.Shell")
Do
    WshShell.Run "cmd /c node C:\Users\quent\.openclaw\workspace\alpha_fund_v3\core\gateway_ultra.js", 0, True
    WScript.Sleep 5000
Loop
