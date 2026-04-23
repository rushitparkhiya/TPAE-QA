<?php
/**
 * MU-Plugin: Fix Elementor hints.php BUG-001
 *
 * Elementor calls is_plugin_active() during the `init` hook in a WP-CLI/non-admin
 * context where wp-admin/includes/plugin.php has not been loaded yet.
 * This causes: Fatal error: Call to undefined function is_plugin_active() in hints.php:366
 *
 * Fix: always ensure plugin.php is loaded early enough.
 */
if ( ! function_exists( 'is_plugin_active' ) ) {
    require_once ABSPATH . 'wp-admin/includes/plugin.php';
}
