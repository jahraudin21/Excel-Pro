Option Explicit

' ==============================================================================
' Standard Module: Module1 (or modLogin)
' Macro to display the Login UserForm
' ==============================================================================

Public Sub ShowLoginForm()
    ' Show the login dialog modelessly or modally (vbModal ensures user must log in first)
    frmLogin.Show vbModal
End Sub
