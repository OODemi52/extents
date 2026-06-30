const WORKGROUP_SIZE: u32 = 16;

/// Debug labels used by one image compute stage.
#[derive(Clone, Copy)]
pub(in crate::renderer::processing_graph::stages) struct ImageComputeStageLabels {
    pub(in crate::renderer::processing_graph::stages) bind_group_layout: &'static str,
    pub(in crate::renderer::processing_graph::stages) pipeline_layout: &'static str,
    pub(in crate::renderer::processing_graph::stages) shader: &'static str,
    pub(in crate::renderer::processing_graph::stages) pipeline: &'static str,
    pub(in crate::renderer::processing_graph::stages) bind_group: &'static str,
    pub(in crate::renderer::processing_graph::stages) encoder: &'static str,
    pub(in crate::renderer::processing_graph::stages) pass: &'static str,
}

/// Shared GPU plumbing for an image compute stage.
///
/// This handles the common graph-stage shape used by stages that read one
/// source texture, write one output texture, and consume one uniform buffer.
pub(in crate::renderer::processing_graph::stages) struct ImageComputeStage {
    pipeline: wgpu::ComputePipeline,
    bind_group_layout: wgpu::BindGroupLayout,
    bind_group: wgpu::BindGroup,
    labels: ImageComputeStageLabels,
}

impl ImageComputeStage {
    /// Creates a compute stage from shader source and initial graph bindings.
    pub(in crate::renderer::processing_graph::stages) fn new(
        device: &wgpu::Device,
        labels: ImageComputeStageLabels,
        shader_source: &'static str,
        source_view: &wgpu::TextureView,
        output_view: &wgpu::TextureView,
        parameters_binding: wgpu::BindingResource<'_>,
        storage_format: wgpu::TextureFormat,
    ) -> Self {
        let bind_group_layout =
            create_bind_group_layout(device, labels.bind_group_layout, storage_format);
        let pipeline = create_pipeline(device, &bind_group_layout, labels, shader_source);
        let bind_group = create_bind_group(
            device,
            &bind_group_layout,
            labels.bind_group,
            source_view,
            output_view,
            parameters_binding,
        );

        Self {
            pipeline,
            bind_group_layout,
            bind_group,
            labels,
        }
    }

    /// Rebinds graph resources after textures are replaced or resized.
    pub(in crate::renderer::processing_graph::stages) fn rebind(
        &mut self,
        device: &wgpu::Device,
        source_view: &wgpu::TextureView,
        output_view: &wgpu::TextureView,
        parameters_binding: wgpu::BindingResource<'_>,
    ) {
        self.bind_group = create_bind_group(
            device,
            &self.bind_group_layout,
            self.labels.bind_group,
            source_view,
            output_view,
            parameters_binding,
        );
    }

    /// Dispatches this compute stage over the provided output dimensions.
    pub(in crate::renderer::processing_graph::stages) fn run(
        &self,
        device: &wgpu::Device,
        queue: &wgpu::Queue,
        width: u32,
        height: u32,
    ) {
        let workgroup_count_x = width.div_ceil(WORKGROUP_SIZE);
        let workgroup_count_y = height.div_ceil(WORKGROUP_SIZE);

        let mut encoder = device.create_command_encoder(&wgpu::CommandEncoderDescriptor {
            label: Some(self.labels.encoder),
        });

        {
            let mut compute_pass = encoder.begin_compute_pass(&wgpu::ComputePassDescriptor {
                label: Some(self.labels.pass),
                timestamp_writes: None,
            });

            compute_pass.set_pipeline(&self.pipeline);
            compute_pass.set_bind_group(0, &self.bind_group, &[]);
            compute_pass.dispatch_workgroups(workgroup_count_x, workgroup_count_y, 1);
        }

        queue.submit(std::iter::once(encoder.finish()));
    }
}

fn create_bind_group_layout(
    device: &wgpu::Device,
    label: &'static str,
    output_format: wgpu::TextureFormat,
) -> wgpu::BindGroupLayout {
    device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
        label: Some(label),
        entries: &[
            wgpu::BindGroupLayoutEntry {
                binding: 0,
                visibility: wgpu::ShaderStages::COMPUTE,
                ty: wgpu::BindingType::Texture {
                    multisampled: false,
                    view_dimension: wgpu::TextureViewDimension::D2,
                    sample_type: wgpu::TextureSampleType::Float { filterable: false },
                },
                count: None,
            },
            wgpu::BindGroupLayoutEntry {
                binding: 1,
                visibility: wgpu::ShaderStages::COMPUTE,
                ty: wgpu::BindingType::StorageTexture {
                    access: wgpu::StorageTextureAccess::WriteOnly,
                    format: output_format,
                    view_dimension: wgpu::TextureViewDimension::D2,
                },
                count: None,
            },
            wgpu::BindGroupLayoutEntry {
                binding: 2,
                visibility: wgpu::ShaderStages::COMPUTE,
                ty: wgpu::BindingType::Buffer {
                    ty: wgpu::BufferBindingType::Uniform,
                    has_dynamic_offset: false,
                    min_binding_size: None,
                },
                count: None,
            },
        ],
    })
}

fn create_pipeline(
    device: &wgpu::Device,
    bind_group_layout: &wgpu::BindGroupLayout,
    labels: ImageComputeStageLabels,
    shader_source: &'static str,
) -> wgpu::ComputePipeline {
    let pipeline_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
        label: Some(labels.pipeline_layout),
        bind_group_layouts: &[bind_group_layout],
        push_constant_ranges: &[],
    });

    let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
        label: Some(labels.shader),
        source: wgpu::ShaderSource::Wgsl(shader_source.into()),
    });

    device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
        label: Some(labels.pipeline),
        layout: Some(&pipeline_layout),
        module: &shader,
        entry_point: Some("cs_main"),
        compilation_options: wgpu::PipelineCompilationOptions::default(),
        cache: None,
    })
}

fn create_bind_group(
    device: &wgpu::Device,
    bind_group_layout: &wgpu::BindGroupLayout,
    label: &'static str,
    source_view: &wgpu::TextureView,
    output_view: &wgpu::TextureView,
    parameters_binding: wgpu::BindingResource<'_>,
) -> wgpu::BindGroup {
    device.create_bind_group(&wgpu::BindGroupDescriptor {
        label: Some(label),
        layout: bind_group_layout,
        entries: &[
            wgpu::BindGroupEntry {
                binding: 0,
                resource: wgpu::BindingResource::TextureView(source_view),
            },
            wgpu::BindGroupEntry {
                binding: 1,
                resource: wgpu::BindingResource::TextureView(output_view),
            },
            wgpu::BindGroupEntry {
                binding: 2,
                resource: parameters_binding,
            },
        ],
    })
}
