mod raster;
mod raw_bayer;

use super::super::parameters::SourceKind;

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
        source_kind: SourceKind,
        source_view: &wgpu::TextureView,
        output_view: &wgpu::TextureView,
        development_parameters_binding: wgpu::BindingResource<'_>,
    ) -> Self {
        match source_kind {
            SourceKind::RasterSrgb => Self::Raster(RasterDevelopmentStage::new(
                device,
                source_view,
                output_view,
                development_parameters_binding,
            )),
            SourceKind::RawBayer2x2 => Self::RawBayer(RawBayerDevelopmentStage::new(
                device,
                queue,
                source_view,
                output_view,
                development_parameters_binding,
            )),
        }
    }

    /// Returns the source kind this development pipeline was created for.
    pub(in crate::renderer::processing_graph) fn source_kind(&self) -> SourceKind {
        match self {
            Self::Raster(_) => SourceKind::RasterSrgb,
            Self::RawBayer(_) => SourceKind::RawBayer2x2,
        }
    }

    /// Recreates this pipeline if the source kind changed, otherwise rebinds resources.
    pub(in crate::renderer::processing_graph) fn rebuild_or_rebind(
        &mut self,
        device: &wgpu::Device,
        queue: &wgpu::Queue,
        source_kind: SourceKind,
        source_view: &wgpu::TextureView,
        output_view: &wgpu::TextureView,
        development_parameters_binding: wgpu::BindingResource<'_>,
        width: u32,
        height: u32,
    ) {
        if self.source_kind() != source_kind {
            *self = Self::new(
                device,
                queue,
                source_kind,
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
