Option Explicit

' ==============================================================================
' ThisWorkbook Object Code
' Automatically display the login dialog whenever this Excel workbook is opened.
' ==============================================================================

Private Sub Workbook_Open()
    ' Prompt login immediately upon opening
    frmLogin.Show vbModal
End Sub
