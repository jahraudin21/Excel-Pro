VERSION 5.00
Begin {C62A69F0-16DC-11CE-9E98-00AA00574A4F} frmLogin 
   Caption         =   "System Login"
   ClientHeight    =   3150
   ClientLeft      =   120
   ClientTop       =   465
   ClientWidth     =   5400
   OleObjectBlob   =   "frmLogin.frx":0000
   StartUpPosition =   1  'CenterOwner
End
Attribute VB_Name = "frmLogin"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Option Explicit

' ==============================================================================
' Classic Excel VBA Login UserForm
' Controls expected on frmLogin:
'   - txtUsername : TextBox (Username input)
'   - txtPassword : TextBox (Password input, PasswordChar = "*")
'   - btnLogin    : CommandButton (Default = True)
'   - btnCancel   : CommandButton (Cancel = True)
'   - lblStatus   : Label (Optional feedback / error message)
' ==============================================================================

Private Const MAX_ATTEMPTS As Integer = 3
Private loginAttempts As Integer

Private Sub UserForm_Initialize()
    ' Initialize form state and attempt counter
    loginAttempts = 0
    txtUsername.Text = vbNullString
    txtPassword.Text = vbNullString
    
    ' Mask password characters with asterisk
    txtPassword.PasswordChar = "*"
    
    ' Set initial focus to Username box
    txtUsername.SetFocus
End Sub

Private Sub btnLogin_Click()
    Dim uName As String
    Dim pWord As String
    
    uName = Trim$(txtUsername.Text)
    pWord = txtPassword.Text
    
    ' 1. Validate non-empty inputs
    If Len(uName) = 0 Then
        MsgBox "Please enter your username.", vbExclamation, "Login Required"
        txtUsername.SetFocus
        Exit Sub
    End If
    
    If Len(pWord) = 0 Then
        MsgBox "Please enter your password.", vbExclamation, "Login Required"
        txtPassword.SetFocus
        Exit Sub
    End If
    
    ' 2. Verify credentials
    '    (Replace ValidateCredentials logic with your actual credentials / sheet lookup)
    If ValidateCredentials(uName, pWord) Then
        MsgBox "Welcome, " & uName & "! Login successful.", vbInformation, "Access Granted"
        Unload Me
        ' Example: Call your main application routine or unhide protected sheets here
        ' MainApplicationStart
    Else
        loginAttempts = loginAttempts + 1
        
        If loginAttempts >= MAX_ATTEMPTS Then
            MsgBox "Maximum login attempts (" & MAX_ATTEMPTS & ") exceeded." & vbCrLf & _
                   "The application will now close.", vbCritical, "Access Denied"
            Unload Me
            ' If you want to protect the workbook, close without saving:
            ' ThisWorkbook.Close SaveChanges:=False
        Else
            Dim remaining As Integer
            remaining = MAX_ATTEMPTS - loginAttempts
            MsgBox "Invalid username or password." & vbCrLf & _
                   "Attempts remaining: " & remaining, vbExclamation, "Authentication Failed"
            
            txtPassword.Text = vbNullString
            txtPassword.SetFocus
        End If
    End If
End Sub

Private Sub btnCancel_Click()
    ' Close userform when Cancel is clicked or Esc is pressed
    Unload Me
End Sub

Private Sub UserForm_QueryClose(Cancel As Integer, CloseMode As Integer)
    ' Optional: prevent closing via the 'X' button if you require mandatory login
    ' If CloseMode = vbFormControlMenu Then
    '     Cancel = True
    '     MsgBox "Please log in or click Cancel to exit.", vbExclamation, "Login Required"
    ' End If
End Sub

' ==============================================================================
' Credential Validation Helper
' Replace with your database, worksheet lookup, or hardcoded admin accounts
' ==============================================================================
Private Function ValidateCredentials(ByVal strUser As String, ByVal strPass As String) As Boolean
    ' Example 1: Hardcoded check (case-insensitive username, case-sensitive password)
    If LCase$(strUser) = "admin" And strPass = "Password123" Then
        ValidateCredentials = True
        Exit Function
    End If
    
    If LCase$(strUser) = "user" And strPass = "User@2026" Then
        ValidateCredentials = True
        Exit Function
    End If
    
    ' Example 2: Check against a hidden "Users" worksheet (A: Username, B: Password)
    ' Dim ws As Worksheet
    ' Dim rFound As Range
    ' On Error Resume Next
    ' Set ws = ThisWorkbook.Sheets("Users")
    ' On Error GoTo 0
    ' If Not ws Is Nothing Then
    '     Set rFound = ws.Columns("A").Find(What:=strUser, LookIn:=xlValues, LookAt:=xlWhole, MatchCase:=False)
    '     If Not rFound Is Nothing Then
    '         If CStr(rFound.Offset(0, 1).Value) = strPass Then
    '             ValidateCredentials = True
    '             Exit Function
    '         End If
    '     End If
    ' End If
    
    ValidateCredentials = False
End Function
