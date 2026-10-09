package com.example.dashboard;

import javax.swing.*;
import java.awt.*;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;

/**
 * Login Panel for the CardLayout demo application.
 */
public class LoginPanel extends JPanel {
    private JTextField usernameField;
    private JPasswordField passwordField;

    public LoginPanel() {
        setLayout(new BorderLayout(10, 10));
        setBackground(new Color(0xF5F5F5));

        // Title
        JLabel titleLabel = new JLabel("Welcome Back");
        titleLabel.setFont(new Font("Segoe UI", Font.BOLD, 24));
        titleLabel.setHorizontalAlignment(SwingConstants.CENTER);

        // Subtitle
        JLabel subtitleLabel = new JLabel("Please sign in to continue");
        subtitleLabel.setFont(new Font("Segoe UI", Font.PLAIN, 14));
        subtitleLabel.setHorizontalAlignment(SwingConstants.CENTER);

        // Form panel
        JPanel formPanel = new JPanel(new GridBagLayout());
        formPanel.setBorder(BorderFactory.createEmptyBorder(20, 30, 20, 30));
        formPanel.setBackground(new Color(0xF5F5F5));

        GridBagConstraints gbc = new GridBagConstraints();
        gbc.gridx = 0;
        gbc.gridy = 0;
        gbc.anchor = GridBagConstraints.WEST;
        gbc.insets = new Insets(5, 5, 5, 10);

        // Username
        gbc.gridy = 0;
        JLabel usernameLabel = new JLabel("Username:");
        usernameLabel.setFont(new Font("Segoe UI", Font.PLAIN, 13));
        formPanel.add(usernameLabel, gbc);

        usernameField = new JTextField(20);
        gbc.gridx = 1;
        gbc.weightx = 1.0;
        gbc.fill = GridBagConstraints.HORIZONTAL;
        formPanel.add(usernameField, gbc);

        // Password
        gbc.gridx = 0;
        gbc.gridy = 1;
        gbc.weightx = 0.0;
        gbc.fill = GridBagConstraints.NONE;
        JLabel passwordLabel = new JLabel("Password:");
        passwordLabel.setFont(new Font("Segoe UI", Font.PLAIN, 13));
        formPanel.add(passwordLabel, gbc);

        passwordField = new JPasswordField(20);
        gbc.gridx = 1;
        formPanel.add(passwordField, gbc);

        // Remember me
        gbc.gridx = 0;
        gbc.gridy = 2;
        gbc.gridwidth = 2;
        JCheckBox rememberMe = new JCheckBox("Remember me");
        rememberMe.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        formPanel.add(rememberMe, gbc);

        // Bottom panel with forgot password
        gbc.gridx = 0;
        gbc.gridy = 3;
        gbc.gridwidth = 2;
        JPanel bottomPanel = new JPanel(new BorderLayout());
        JLabel forgotPasswordLabel = new JLabel("Forgot Password?");
        forgotPasswordLabel.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        forgotPasswordLabel.setForeground(new Color(0x0078D4));
        forgotPasswordLabel.setCursor(new Cursor(Cursor.HAND_CURSOR));
        bottomPanel.add(forgotPasswordLabel, BorderLayout.WEST);
        bottomPanel.setBackground(new Color(0xF5F5F5));
        formPanel.add(bottomPanel, gbc);

        // Buttons
        JButton loginButton = new JButton("Login");
        loginButton.setFont(new Font("Segoe UI", Font.BOLD, 13));
        loginButton.setForeground(Color.WHITE);
        loginButton.setBackground(new Color(0x0078D4));
        loginButton.setFocusPainted(false);
        loginButton.setBorder(BorderFactory.createEmptyBorder(10, 20, 10, 20));
        loginButton.setCursor(new Cursor(Cursor.HAND_CURSOR));

        JButton createAccountButton = new JButton("Create Account");
        createAccountButton.setFont(new Font("Segoe UI", Font.BOLD, 13));
        createAccountButton.setForeground(new Color(0x333333));
        createAccountButton.setBackground(Color.WHITE);
        createAccountButton.setFocusPainted(false);
        createAccountButton.setBorder(BorderFactory.createLineBorder(new Color(0xDDDDDD), 1));
        createAccountButton.setCursor(new Cursor(Cursor.HAND_CURSOR));

        loginButton.addActionListener(new ActionListener() {
            @Override
            public void actionPerformed(ActionEvent e) {
                JOptionPane.showMessageDialog(null, "Login clicked!\n(username: " + usernameField.getText() + ")",
                        "Login Info", JOptionPane.INFORMATION_MESSAGE);
            }
        });

        createAccountButton.addActionListener(new ActionListener() {
            @Override
            public void actionPerformed(ActionEvent e) {
                // Switch to create account screen using CardLayout's show method
                Main mainApp = (Main) SwingUtilities.getWindowAncestor(LoginPanel.this);
                if (mainApp != null) {
                    mainApp.showCreateAccountScreen();
                }
            }
        });

        JPanel buttonPanel = new JPanel(new FlowLayout(FlowLayout.CENTER, 10, 0));
        buttonPanel.setBackground(new Color(0xF5F5F5));
        buttonPanel.add(loginButton);
        buttonPanel.add(createAccountButton);

        add(titleLabel, BorderLayout.NORTH);
        add(subtitleLabel, BorderLayout.CENTER);
        add(formPanel, BorderLayout.CENTER);
        add(buttonPanel, BorderLayout.SOUTH);
        setPreferredSize(new Dimension(400, 500));
    }

    public String getUsername() {
        return usernameField.getText();
    }

    public String getPassword() {
        return new String(passwordField.getPassword());
    }
}
