use super::context::{GpuContext, SurfaceContext};
use super::display_resources::DisplayResources;
use super::image_request::ImageRequest;
use super::input::{DevelopmentSource, DisplayIntent, Input, OutputTransformSettings};
use super::inspection::{
    ImageInspection, InspectionSnapshot, PipelineInspection, RawImageInspection,
};
use super::processing_graph::{DevelopmentParameters, ImageProcessingGraph};
use super::schedule::{RenderSchedule, RenderState};
use super::viewer::Viewer;
use crate::core::editing::EditRecipe;
use anyhow::{Context, Result};
use log::{error, info};
use tauri::async_runtime::JoinHandle;
use tauri::WebviewWindow;

pub struct Renderer {
    gpu: GpuContext,
    surface: SurfaceContext,
    processing_graph: ImageProcessingGraph,
    display_resources: DisplayResources,
    viewer: Viewer,
    image_request: ImageRequest,
    render_schedule: RenderSchedule,
    inspection: InspectionSnapshot,
    has_image: bool,
}

impl Renderer {
    pub fn new(window: WebviewWindow) -> Result<Self> {
        let window_size = match window
            .inner_size()
            .context("failed to read renderer window size")
        {
            Ok(window_size) => window_size,
            Err(error) => return Err(error),
        };

        let gpu = match GpuContext::new() {
            Ok(gpu) => gpu,
            Err(error) => return Err(error),
        };

        let surface = match SurfaceContext::new(window, &gpu) {
            Ok(surface) => surface,
            Err(error) => return Err(error),
        };

        let processing_graph = ImageProcessingGraph::new(&gpu.device, &gpu.queue);

        let display_resources = DisplayResources::new(
            &gpu.device,
            surface.format(),
            processing_graph.output_view(),
        );

        let viewer = Viewer::new(window_size.width, window_size.height);

        let image_request = ImageRequest::new();

        let render_schedule = RenderSchedule::new();
        let inspection =
            InspectionSnapshot::empty(surface.format(), surface.width(), surface.height());

        let mut renderer = Self {
            gpu,
            surface,
            processing_graph,
            display_resources,
            viewer,
            image_request,
            render_schedule,
            inspection,
            has_image: false,
        };

        renderer.refresh_texture_inspection();
        renderer.update_vertices();

        Ok(renderer)
    }

    pub fn begin_image_request(&mut self) -> u64 {
        self.image_request.begin_request()
    }

    pub fn attach_load_handle(&mut self, request_id: u64, handle: JoinHandle<()>) {
        self.image_request.attach_load_handle(request_id, handle);
    }

    pub fn complete_image_request(&mut self, request_id: u64) {
        self.image_request.complete_request(request_id);
    }

    pub fn is_request_active(&self, request_id: u64) -> bool {
        self.image_request.is_request_active(request_id)
    }

    pub fn update_vertices(&mut self) {
        let window_width = self.surface.width();

        let window_height = self.surface.height();

        if window_width == 0
            || window_height == 0
            || self.processing_graph.output_width() == 0
            || self.processing_graph.output_height() == 0
        {
            return;
        }

        if !self.viewer.has_valid_viewport() {
            return;
        }

        let (scale_x, scale_y) = self.display_resources.update_vertices_for_surface(
            &self.gpu.queue,
            window_width,
            window_height,
            self.processing_graph.output_width(),
            self.processing_graph.output_height(),
        );

        self.viewer.update_image_quad_scale(scale_x, scale_y);

        self.viewer.update_fit_scale(window_width, window_height);

        self.apply_transform();
    }

    pub fn resize(&mut self, new_width: u32, new_height: u32) {
        self.surface.resize(&self.gpu, new_width, new_height);
        self.refresh_texture_inspection();
    }

    /// Sets the current input as the live display image.
    pub(super) fn set_input(&mut self, input: Input, input_build_ms: Option<f64>) {
        let image = input.image();
        let dimensions = image.dimensions();
        let development_source = input.development_source();
        let development_parameters = input.development_parameters();
        let output_transform = input.output_transform();

        self.display_checkboard(image.has_transparency());
        self.update_inspection_for_input(
            dimensions.width(),
            dimensions.height(),
            image.has_transparency(),
            development_source,
            development_parameters,
            output_transform,
        );
        self.inspection.timings.input_build_ms = input_build_ms;
        self.update_output_transform(output_transform);
        self.upload_source_image(
            image.texels(),
            dimensions.width(),
            dimensions.height(),
            development_source,
            development_parameters,
        );
    }

    fn upload_source_image(
        &mut self,
        texels: &[f32],
        width: u32,
        height: u32,
        development_source: DevelopmentSource,
        development_parameters: DevelopmentParameters,
    ) {
        info!("[Renderer] Uploading source image ({}x{})", width, height);

        self.has_image = true;

        self.processing_graph.upload_source_image(
            &self.gpu.device,
            &self.gpu.queue,
            texels,
            width,
            height,
            development_source,
            development_parameters,
        );
        self.refresh_texture_inspection();

        self.display_resources
            .bind_image_texture(&self.gpu.device, self.processing_graph.output_view());

        self.update_vertices();
    }

    /// Updates graph-owned edit parameters and reruns GPU image processing.
    pub fn update_edit_recipe(&mut self, recipe: &EditRecipe) {
        self.processing_graph.update_adjustments(
            &self.gpu.device,
            &self.gpu.queue,
            recipe.exposure_ev,
        );
        self.inspection.pipeline.user_exposure_ev = recipe.exposure_ev;
    }

    /// Updates active output transform parameters while preserving other display state.
    fn update_output_transform(&mut self, output_transform: OutputTransformSettings) {
        self.processing_graph.update_output_transform(
            &self.gpu.device,
            &self.gpu.queue,
            graph_display_intent(output_transform.display_intent()),
            output_transform.base_exposure_ev(),
        );
    }

    pub fn clear(&mut self) {
        self.image_request.clear();

        self.has_image = false;
        self.inspection.has_image = false;
        self.inspection.image = None;

        self.render();
    }

    pub fn update_transform(&mut self, scale: f32, offset_x: f32, offset_y: f32) {
        self.viewer.update_user_transform(scale, offset_x, offset_y);

        self.apply_transform();
    }

    fn display_checkboard(&mut self, enabled: bool) {
        if !self.viewer.set_checkerboard_enabled(enabled) {
            return;
        }

        self.apply_transform();
    }

    pub fn update_proxy_viewport(&mut self, x: f32, y: f32, width: f32, height: f32) {
        self.viewer.update_viewport(x, y, width, height);
    }

    pub fn should_render(&self) -> bool {
        self.render_schedule.should_render()
    }

    pub fn set_render_state(&mut self, state: RenderState) {
        self.render_schedule.set_state(state);
    }

    pub fn render(&mut self) {
        if self.render_schedule.is_paused() {
            return;
        }

        let output = match self.surface.current_texture() {
            Ok(texture) => texture,

            Err(wgpu::SurfaceError::Lost | wgpu::SurfaceError::Outdated) => {
                return;
            }

            Err(e) => {
                error!("[Renderer] Failed to get current texture: {:?}", e);
                return;
            }
        };

        let view = output
            .texture
            .create_view(&wgpu::TextureViewDescriptor::default());

        let mut encoder = self
            .gpu
            .device
            .create_command_encoder(&wgpu::CommandEncoderDescriptor {
                label: Some("Render Encoder"),
            });

        {
            let mut render_pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("Render Pass"),
                color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                    view: &view,
                    resolve_target: None,
                    ops: wgpu::Operations {
                        // Need to change here to make backgorund of renderer customizeable
                        load: wgpu::LoadOp::Clear(wgpu::Color {
                            r: 0.01,
                            g: 0.01,
                            b: 0.01,
                            a: 1.0,
                        }),
                        store: wgpu::StoreOp::Store,
                    },
                    depth_slice: None,
                })],
                depth_stencil_attachment: None,
                timestamp_writes: None,
                occlusion_query_set: None,
            });

            render_pass.set_viewport(
                0.0,
                0.0,
                self.surface.width() as f32,
                self.surface.height() as f32,
                0.0,
                1.0,
            );

            if self.has_image {
                self.display_resources.draw(&mut render_pass);
            }
        }

        self.gpu.queue.submit(std::iter::once(encoder.finish()));

        output.present();

        self.render_schedule.mark_rendered();
    }

    /// Returns the current Inspector snapshot.
    pub fn inspection_snapshot(&self) -> InspectionSnapshot {
        self.inspection.clone()
    }

    fn apply_transform(&mut self) {
        let Some(transform) = self
            .viewer
            .transform_for_surface(self.surface.width(), self.surface.height())
        else {
            return;
        };

        self.display_resources.update_transform(
            &self.gpu.queue,
            transform.scale,
            transform.offset_x,
            transform.offset_y,
            transform.checkerboard_enabled,
        );
    }

    fn update_inspection_for_input(
        &mut self,
        width: u32,
        height: u32,
        has_transparency: bool,
        development_source: DevelopmentSource,
        development_parameters: DevelopmentParameters,
        output_transform: OutputTransformSettings,
    ) {
        self.inspection.has_image = true;
        self.inspection.image = Some(ImageInspection {
            source_kind: source_kind_label(development_source).to_string(),
            width,
            height,
            has_transparency,
            raw: development_parameters
                .raw_bayer_cfa_pattern()
                .map(RawImageInspection::from_bayer_cfa_pattern),
        });
        self.inspection.pipeline = PipelineInspection {
            development_source: development_source_label(development_source).to_string(),
            display_intent: display_intent_label(output_transform.display_intent()).to_string(),
            base_exposure_ev: Some(output_transform.base_exposure_ev()),
            user_exposure_ev: self.inspection.pipeline.user_exposure_ev,
        };
    }

    fn refresh_texture_inspection(&mut self) {
        self.inspection.textures = self.processing_graph.texture_inspection(
            self.surface.format(),
            self.surface.width(),
            self.surface.height(),
        );
    }
}

fn graph_display_intent(intent: DisplayIntent) -> u32 {
    match intent {
        DisplayIntent::DirectSdr => 0,
        DisplayIntent::ToneMapToSdr => 1,
    }
}

fn source_kind_label(source: DevelopmentSource) -> &'static str {
    match source {
        DevelopmentSource::RasterSrgb => "Raster",
        DevelopmentSource::RawBayer2x2 => "RAW",
    }
}

fn development_source_label(source: DevelopmentSource) -> &'static str {
    match source {
        DevelopmentSource::RasterSrgb => "Raster sRGB",
        DevelopmentSource::RawBayer2x2 => "RAW Bayer 2x2",
    }
}

fn display_intent_label(intent: DisplayIntent) -> &'static str {
    match intent {
        DisplayIntent::DirectSdr => "Direct SDR",
        DisplayIntent::ToneMapToSdr => "Tone Map to SDR",
    }
}
