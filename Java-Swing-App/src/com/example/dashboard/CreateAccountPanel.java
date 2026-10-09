package com.example.dashboard;

import javax.swing.*;
import java.awt.*;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;

/**
 * Create Account Panel for the CardLayout demo application.
 */
public class CreateAccountPanel extends JPanel {
    private JTextField firstNameField;
    private JTextField lastNameField;
    private JTextField emailField;
    private JTextField usernameField;
    private JPasswordField passwordField;
    private JPasswordField confirmPasswordField;

    public CreateAccountPanel() {
        setLayout(new BorderLayout(10, 10));
        setBackground(new Color(0xF5F5F5));

        JLabel titleLabel = new JLabel("Create Account");
        titleLabel.setFont(new Font("Segoe UI", Font.BOLD, 24));
        titleLabel.setHorizontalAlignment(SwingConstants.CENTER);

        JLabel subtitleLabel = new JLabel("Sign up to get started");
        subtitleLabel.setFont(new Font("Segoe UI", Font.PLAIN, 14));
        subtitleLabel.setHorizontalAlignment(SwingConstants.CENTER);

        JPanel formPanel = new JPanel(new GridBagLayout());
        formPanel.setBorder(BorderFactory.createEmptyBorder(20, 30, 20, 30));
        formPanel.setBackground(new Color(0xF5F5F5));

        GridBagConstraints gbc = new GridBagConstraints();
        gbc.gridx = 0;
        gbc.gridy = 0;
        gbc.anchor = GridBagConstraints.WEST;
        gbc.insets = new Insets(5, 5, 5, 10);

        // First Name
        gbc.gridy = 0;
        JLabel firstNameLabel = new JLabel("First Name:");
        firstNameLabel.setFont(new Font("Segoe UI", Font.PLAIN, 13));
        formPanel.add(firstNameLabel, gbc);

        firstNameField = new JTextField(20);
        gbc.gridx = 1;
        gbc.weightx = 1.0;
        gbc.fill = GridBagConstraints.HORIZONTAL;
        formPanel.add(firstNameField, gbc);

        // Last Name
        gbc.gridx = 0;
        gbc.gridy = 1;
        gbc.weightx = 0.0;
        gbc.fill = GridBagConstraints.NONE;
        JLabel lastNameLabel = new JLabel("Last Name:");
        lastNameLabel.setFont(new Font("Segoe UI", Font.PLAIN, 13));
        formPanel.add(lastNameLabel, gbc);

        lastNameField = new JTextField(20);
        gbc.gridx = 1;
        formPanel.add(lastNameField, gbc);

        // Email
        gbc.gridx = 0;
        gbc.gridy = 2;
        JLabel emailLabel = new JLabel("Email:");
        emailLabel.setFont(new Font("Segoe UI", Font.PLAIN, 13));
        formPanel.add(emailLabel, gbc);

        emailField = new JTextField(20);
        gbc.gridx = 1;
        formPanel.add(emailField, gbc);

        // Username
        gbc.gridx = 0;
        gbc.gridy = 3;
        JLabel usernameLabel = new JLabel("Username:");
        usernameLabel.setFont(new Font("Segoe UI", Font.PLAIN, 13));
        formPanel.add(usernameLabel, gbc);

        usernameField = new JTextField(20);
        gbc.gridx = 1;
        formPanel.add(usernameField, gbc);

        // Password
        gbc.gridx = 0;
        gbc.gridy = 4;
        JLabel passwordLabel = new JLabel("Password:");
        passwordLabel.setFont(new Font("Segoe UI", Font.PLAIN, 13));
        formPanel.add(passwordLabel, gbc);

        passwordField = new JPasswordField(20);
        gbc.gridx = 1;
        formPanel.add(passwordField, gbc);

        // Confirm Password
        gbc.gridx = 0;
        gbc.gridy = 5;
        JLabel confirmLabel = new JLabel("Confirm Password:");
        confirmLabel.setFont(new Font("Segoe UI", Font.PLAIN, 13));
        formPanel.add(confirmLabel, gbc);

        confirmPasswordField = new JPasswordField(20);
        gbc.gridx = 1;
        formPanel.add(confirmPasswordField, gbc);

        add(titleLabel, BorderLayout.NORTH);
        add(subtitleLabel, BorderLayout.CENTER);
        add(formPanel, BorderLayout.CENTER);
        setPreferredSize(new Dimension(400, 450));

        // Buttons
        JButton createAccountButton = new JButton("Create Account");
        createAccountButton.setFont(new Font("Segoe UI", Font.BOLD, 13));
        createAccountButton.setForeground(Color.WHITE);
        createAccountButton.setBackground(new Color(0x0078D4));
        createAccountButton.setFocusPainted(false);
        createAccountButton.setBorder(BorderFactory.createEmptyBorder(10, 20, 10, 20));
        createAccountButton.setCursor(new Cursor(Cursor.HAND_CURSOR));

        JButton backButton = new JButton("Back to Login");
        backButton.setFont(new Font("Segoe UI", Font.BOLD, 13));
        backButton.setForeground(new Color(0x333333));
        backButton.setBackground(Color.WHITE);
        backButton.setFocusPainted(false);
        backButton.setBorder(BorderFactory.createLineBorder(new Color(0xDDDDDD), 1));
        backButton.setCursor(new Cursor(Cursor.HAND_CURSOR));

        createAccountButton.addActionListener(new ActionListener() {
            @Override
            public void actionPerformed(ActionEvent e) {
                if (validateForm()) {
                    JOptionPane.showMessageDialog(null,
                            "Account created successfully!\nUsername: " + usernameField.getText(),
                            "Success", JOptionPane.INFORMATION_MESSAGE);
                }
            }
        });

        backButton.addActionListener(new ActionListener() {
            @Override
            public void actionPerformed(ActionEvent e) {
                // Switch back to login screen using CardLayout's show method
                Main mainApp = (Main) SwingUtilities.getWindowAncestor(CreateAccountPanel.this);
                if (mainApp != null) {
                    mainApp.showLoginScreen();
                }
            }
        });

        JPanel buttonPanel = new JPanel(new FlowLayout(FlowLayout.CENTER, 10, 0));
        buttonPanel.setBackground(new Color(0xF5F5F5));
        buttonPanel.add(createAccountButton);
        buttonPanel.add(backButton);

        add(buttonPanel, BorderLayout.SOUTH);
        setPreferredSize(new Dimension(400, 550));
    }
    }

    public String getFirstName() { return firstNameField.getText(); }
    public String getLastName() { return lastNameField.getText(); }
    public String getEmail() { return emailField.getText(); }
    public String getUsername() { return usernameField.getText(); }
    public String getPassword() { return new String(passwordField.getPassword()); }
    
    private boolean validateForm() {
        if (firstNameField.getText().isEmpty()) {
            JOptionPane.showMessageDialog(this, "Please enter your first name", "Validation Error", JOptionPane.WARNING_MESSAGE);
            return false;
        }
        if (lastNameField.getText().isEmpty()) {
            JOptionPane.showMessageDialog(this, "Please enter your last name", "Validation Error", JOptionPane.WARNING_MESSAGE);
            return false;
        }
        if (emailField.getText().isEmpty()) {
            JOptionPane.showMessageDialog(this, "Please enter your email", "Validation Error", JOptionPane.WARNING_MESSAGE);
            return false;
        }
        if (usernameField.getText().isEmpty()) {
            JOptionPane.showMessageDialog(this, "Please enter a username", "Validation Error", JOptionPane.WARNING_MESSAGE);
            return false;
        }
        if (passwordField.getPassword().length < 6) {
            JOptionPane.showMessageDialog(this, "Password must be at least 6 characters", "Validation Error", JOptionPane.WARNING_MESSAGE);
            return false;
        }
        if (!new String(passwordField.getPassword()).equals(new String(confirmPasswordField.getPassword()))) {
            JOptionPane.showMessageDialog(this, "Passwords do not match", "Validation Error", JOptionPane.WARNING_MESSAGE);
            return false;
        }
        return true;
    }
}
