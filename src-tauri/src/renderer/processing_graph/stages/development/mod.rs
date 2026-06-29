mod raster;
mod raw_bayer;

use crate::renderer::input::DevelopmentSource;
use raster::RasterDevelopmentStage;
use raw_bayer::RawBayerDevelopmentStage;

/// Source-specific development pipeline for uploaded renderer input.
///
/// Raster input and RAW Bayer input have different source-domain semantics, so
/// development is selected at the graph boundary instead of branching inside one
/// large shader.
pub(in crate::renderer::processing_graph) enum DevelopmentStage {
    Raster(RasterDevelopmentStage),
    RawBayer(RawBayerDevelopmentStage),
}

impl DevelopmentStage {
    /// Creates a development pipeline for the provided source kind.
    pub(in crate::renderer::processing_graph) fn new(
        device: &wgpu::Device,
        queue: &wgpu::Queue,
        development_source: DevelopmentSource,
        source_view: &wgpu::TextureView,
        output_view: &wgpu::TextureView,
        development_parameters_binding: wgpu::BindingResource<'_>,
    ) -> Self {
        match development_source {
            DevelopmentSource::RasterSrgb => Self::Raster(RasterDevelopmentStage::new(
                device,
                source_view,
                output_view,
                development_parameters_binding,
            )),
            DevelopmentSource::RawBayer2x2 => Self::RawBayer(RawBayerDevelopmentStage::new(
                device,
                queue,
                source_view,
                output_view,
                development_parameters_binding,
            )),
        }
    }

    /// Returns the source kind this development pipeline was created for.
    pub(in crate::renderer::processing_graph) fn development_source(&self) -> DevelopmentSource {
        match self {
            Self::Raster(_) => DevelopmentSource::RasterSrgb,
            Self::RawBayer(_) => DevelopmentSource::RawBayer2x2,
        }
    }

    /// Recreates this pipeline if the source kind changed, otherwise rebinds resources.
    pub(in crate::renderer::processing_graph) fn rebuild_or_rebind(
        &mut self,
        device: &wgpu::Device,
        queue: &wgpu::Queue,
        development_source: DevelopmentSource,
        source_view: &wgpu::TextureView,
        output_view: &wgpu::TextureView,
        development_parameters_binding: wgpu::BindingResource<'_>,
        width: u32,
        height: u32,
    ) {
        if self.development_source() != development_source {
            *self = Self::new(
                device,
                queue,
                development_source,
                source_view,
                output_view,
                development_parameters_binding.clone(),
            );
        }

        self.rebind(
            device,
            source_view,
            output_view,
            development_parameters_binding,
            width,
            height,
        );
    }

    /// Rebinds this pipeline after graph texture resources are replaced.
    pub(in crate::renderer::processing_graph) fn rebind(
        &mut self,
        device: &wgpu::Device,
        source_view: &wgpu::TextureView,
        output_view: &wgpu::TextureView,
        development_parameters_binding: wgpu::BindingResource<'_>,
        width: u32,
        height: u32,
    ) {
        match self {
            Self::Raster(stage) => stage.rebind(
                device,
                source_view,
                output_view,
                development_parameters_binding,
            ),
            Self::RawBayer(stage) => stage.rebind(
                device,
                source_view,
                output_view,
                development_parameters_binding,
                width,
                height,
            ),
        }
    }

    /// Runs the selected development pipeline over the current source dimensions.
    pub(in crate::renderer::processing_graph) fn run(
        &self,
        device: &wgpu::Device,
        queue: &wgpu::Queue,
        width: u32,
        height: u32,
    ) {
        match self {
            Self::Raster(stage) => stage.run(device, queue, width, height),
            Self::RawBayer(stage) => stage.run(device, queue, width, height),
        }
    }
}
