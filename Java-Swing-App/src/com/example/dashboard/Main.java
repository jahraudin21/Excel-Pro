package com.example.dashboard;

import javax.swing.*;
import java.awt.*;

/**
 * Main application class that demonstrates CardLayout screen switching
 * between Login and Create Account screens.
 */
public class Main {
    private JFrame frame;
    private CardLayout cardLayout;
    private JPanel cardPanel;

    public Main() {
        initializeUI();
    }

    private void initializeUI() {
        // Create the main frame
        frame = new JFrame("Professional Dashboard - CardLayout Demo");
        frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        frame.setSize(450, 500);
        frame.setLocationRelativeTo(null); // Center on screen
        frame.setIconImage(new ImageIcon("src/com/example/dashboard/icon.png").getImage());

        // Create CardLayout and container panel
        cardLayout = new CardLayout();
        cardPanel = new JPanel(cardLayout);

        // Create and add panels
        LoginPanel loginPanel = new LoginPanel();
        CreateAccountPanel createAccountPanel = new CreateAccountPanel();

        cardPanel.add(loginPanel, "login");
        cardPanel.add(createAccountPanel, "create_account");

        // Set up the content pane
        frame.getContentPane().add(cardPanel, BorderLayout.CENTER);

        // Set up window decoration
        frame.setUndecorated(false);
        frame.setMinimumSize(new Dimension(400, 450));
    }

    /**
     * Switches to the login screen
     */
    public void showLoginScreen() {
        cardLayout.show(cardPanel, "login");
    }

    /**
     * Switches to the create account screen
     */
    public void showCreateAccountScreen() {
        cardLayout.show(cardPanel, "create_account");
    }

    /**
     * Entry point for the application
     */
    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            try {
                // Set system look and feel
                UIManager.setLookAndFeel(
                    UIManager.getSystemLookAndFeelClassName()
                );
            } catch (Exception e) {
                e.printStackTrace();
            }
            new Main();
        });
    }

    public JFrame getFrame() {
        return frame;
    }
}
