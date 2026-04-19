import 'dotenv/config';
import mongoose from 'mongoose';
import { AgentSchema } from '../src/modules/agents/schemas/agent.schema';

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI is required');
  process.exit(1);
}

async function main() {
  await mongoose.connect(uri!);
  const AgentModel = mongoose.model('Agent', AgentSchema);

  const seedAgents = [
    { name: 'Ayşe Yılmaz', email: 'ayse@iceberg.example' },
    { name: 'Burak Demir', email: 'burak@iceberg.example' },
    { name: 'Ceren Kaya', email: 'ceren@iceberg.example' },
    { name: 'Deniz Arslan', email: 'deniz@iceberg.example' },
    { name: 'Elif Şahin', email: 'elif@iceberg.example' },
  ];

  for (const agent of seedAgents) {
    await AgentModel.updateOne({ email: agent.email }, { $setOnInsert: agent }, { upsert: true });
  }

  const count = await AgentModel.countDocuments();
  console.log(`Seed complete. Total agents: ${count}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
