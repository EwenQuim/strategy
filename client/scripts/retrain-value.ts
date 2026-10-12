import { readPipelineConfig } from './value-config.ts'
import { runValuePipeline } from './value-pipeline.ts'

const report = await runValuePipeline(readPipelineConfig())
if (!report.accepted) process.exitCode = 1
