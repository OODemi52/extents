use tracing::info;
use tracing_appender::rolling;
use tracing_subscriber::{fmt, fmt::time::UtcTime, prelude::*, EnvFilter};

// For now, writing all logs level into same file (rolling logs tho) during early dev
pub fn init_logging() {
    let cache_dir = dirs::cache_dir()
        .unwrap_or_else(|| std::env::temp_dir())
        .join("com.extents.cache");

    let log_dir = cache_dir.join("logs");

    std::fs::create_dir_all(&log_dir).expect("Failed to create log dir");

    let file_appender = rolling::daily(log_dir, "extents.app.log");

    let file_layer = fmt::layer()
        .with_writer(file_appender)
        .with_timer(UtcTime::rfc_3339());

    let console_layer = fmt::layer();

    let subscriber = tracing_subscriber::registry()
        .with(EnvFilter::new("info"))
        .with(file_layer)
        .with(console_layer);

    tracing::subscriber::set_global_default(subscriber).expect("Failed to set global logger");

    info!("Logger initialized.");
}
