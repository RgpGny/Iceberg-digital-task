import 'dotenv/config';
import mongoose, { Schema, Types } from 'mongoose';

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI is required');
  process.exit(1);
}

const p = (pounds: number) => Math.round(pounds * 100);

const MoneySchema = new Schema({ amount: Number, currency: String }, { _id: false });

const AgentModel = mongoose.model(
  'Agent',
  new Schema({ name: String, email: String }, { collection: 'agents', timestamps: true }),
);

const TransactionModel = mongoose.model(
  'Transaction',
  new Schema(
    {
      property: new Schema(
        { address: String, type: { type: String }, listPrice: MoneySchema },
        { _id: false },
      ),
      serviceFee: MoneySchema,
      listingAgentId: Schema.Types.ObjectId,
      sellingAgentId: Schema.Types.ObjectId,
      stage: String,
      stageHistory: [
        new Schema(
          { from: Schema.Types.Mixed, to: String, at: Date, note: String },
          { _id: false },
        ),
      ],
      completedAt: Date,
    },
    { collection: 'transactions', timestamps: true },
  ),
);

const BreakdownModel = mongoose.model(
  'CommissionBreakdown',
  new Schema(
    {
      transactionId: Schema.Types.ObjectId,
      totalFee: MoneySchema,
      agencyShare: MoneySchema,
      agentShares: [
        new Schema(
          {
            agentId: Schema.Types.ObjectId,
            role: String,
            amount: MoneySchema,
            percentage: Number,
            rationale: String,
          },
          { _id: false },
        ),
      ],
      scenario: String,
    },
    {
      collection: 'commission_breakdowns',
      timestamps: { createdAt: 'computedAt', updatedAt: false },
    },
  ),
);

async function main() {
  await mongoose.connect(uri!);

  await BreakdownModel.deleteMany({});
  await TransactionModel.deleteMany({});
  await AgentModel.deleteMany({});
  console.log('Cleared all collections.');

  const agents = await AgentModel.insertMany([
    { name: 'Alice Thompson', email: 'alice@iceberg.example' },
    { name: 'Benjamin Walsh', email: 'benjamin@iceberg.example' },
    { name: 'Charlotte Reed', email: 'charlotte@iceberg.example' },
    { name: 'David Harrison', email: 'david@iceberg.example' },
    { name: 'Emma Clarke', email: 'emma@iceberg.example' },
  ]);
  const [alice, benjamin, charlotte, david, emma] = agents.map((a) => a._id as Types.ObjectId);
  console.log(`Inserted ${agents.length} agents.`);

  const now = new Date();
  const ago = (days: number) => new Date(now.getTime() - days * 86_400_000);

  // 1. Agreement — sale
  await TransactionModel.create({
    property: {
      address: '12 Baker Street, London W1U',
      type: 'sale',
      listPrice: { amount: p(750_000), currency: 'GBP' },
    },
    serviceFee: { amount: p(15_000), currency: 'GBP' },
    listingAgentId: alice,
    sellingAgentId: benjamin,
    stage: 'agreement',
    stageHistory: [{ from: null, to: 'agreement', at: ago(5) }],
    completedAt: null,
  });

  // 2. Agreement — rental
  await TransactionModel.create({
    property: {
      address: '9 Portobello Road, London W11',
      type: 'rental',
      listPrice: { amount: p(2_800), currency: 'GBP' },
    },
    serviceFee: { amount: p(420), currency: 'GBP' },
    listingAgentId: charlotte,
    sellingAgentId: david,
    stage: 'agreement',
    stageHistory: [{ from: null, to: 'agreement', at: ago(2) }],
    completedAt: null,
  });

  // 3. Earnest money — rental
  await TransactionModel.create({
    property: {
      address: '5 Sloane Square, London SW1W',
      type: 'rental',
      listPrice: { amount: p(4_200), currency: 'GBP' },
    },
    serviceFee: { amount: p(630), currency: 'GBP' },
    listingAgentId: emma,
    sellingAgentId: alice,
    stage: 'earnest_money',
    stageHistory: [
      { from: null, to: 'agreement', at: ago(14) },
      { from: 'agreement', to: 'earnest_money', at: ago(7), note: 'Deposit received.' },
    ],
    completedAt: null,
  });

  // 4. Title deed — sale
  await TransactionModel.create({
    property: {
      address: '88 Victoria Street, London SW1E',
      type: 'sale',
      listPrice: { amount: p(520_000), currency: 'GBP' },
    },
    serviceFee: { amount: p(10_400), currency: 'GBP' },
    listingAgentId: benjamin,
    sellingAgentId: charlotte,
    stage: 'title_deed',
    stageHistory: [
      { from: null, to: 'agreement', at: ago(30) },
      { from: 'agreement', to: 'earnest_money', at: ago(20), note: 'Funds cleared.' },
      { from: 'earnest_money', to: 'title_deed', at: ago(8), note: 'Solicitor review complete.' },
    ],
    completedAt: null,
  });

  // 5. Completed — same agent (David)
  const fee5 = p(7_600);
  const agency5 = Math.floor(fee5 / 2);
  const agent5 = fee5 - agency5;
  const t5 = await TransactionModel.create({
    property: {
      address: '3 Greenwich Park Row, London SE10',
      type: 'sale',
      listPrice: { amount: p(380_000), currency: 'GBP' },
    },
    serviceFee: { amount: fee5, currency: 'GBP' },
    listingAgentId: david,
    sellingAgentId: david,
    stage: 'completed',
    stageHistory: [
      { from: null, to: 'agreement', at: ago(45) },
      { from: 'agreement', to: 'earnest_money', at: ago(30) },
      { from: 'earnest_money', to: 'title_deed', at: ago(15) },
      { from: 'title_deed', to: 'completed', at: ago(3), note: 'Keys handed over.' },
    ],
    completedAt: ago(3),
  });
  await BreakdownModel.create({
    transactionId: t5._id,
    totalFee: { amount: fee5, currency: 'GBP' },
    agencyShare: { amount: agency5, currency: 'GBP' },
    agentShares: [
      {
        agentId: david,
        role: 'dual',
        amount: { amount: agent5, currency: 'GBP' },
        percentage: 50,
        rationale: 'Listing and selling agent are the same person — full agent portion (50%).',
      },
    ],
    scenario: 'same_agent',
  });

  // 6. Completed — different agents (Alice listing, Emma selling)
  const fee6 = p(13_000);
  const agency6 = Math.floor(fee6 / 2);
  const agentPot6 = fee6 - agency6;
  const half6a = Math.ceil(agentPot6 / 2);
  const half6b = agentPot6 - half6a;
  const t6 = await TransactionModel.create({
    property: {
      address: '21 Canary Wharf, London E14',
      type: 'sale',
      listPrice: { amount: p(650_000), currency: 'GBP' },
    },
    serviceFee: { amount: fee6, currency: 'GBP' },
    listingAgentId: alice,
    sellingAgentId: emma,
    stage: 'completed',
    stageHistory: [
      { from: null, to: 'agreement', at: ago(60) },
      { from: 'agreement', to: 'earnest_money', at: ago(45) },
      { from: 'earnest_money', to: 'title_deed', at: ago(25) },
      {
        from: 'title_deed',
        to: 'completed',
        at: ago(10),
        note: 'Transfer registered at Land Registry.',
      },
    ],
    completedAt: ago(10),
  });
  await BreakdownModel.create({
    transactionId: t6._id,
    totalFee: { amount: fee6, currency: 'GBP' },
    agencyShare: { amount: agency6, currency: 'GBP' },
    agentShares: [
      {
        agentId: alice,
        role: 'listing',
        amount: { amount: half6a, currency: 'GBP' },
        percentage: 25,
        rationale: 'Listing agent — 25% of total (half of the agent portion).',
      },
      {
        agentId: emma,
        role: 'selling',
        amount: { amount: half6b, currency: 'GBP' },
        percentage: 25,
        rationale: 'Selling agent — 25% of total (half of the agent portion).',
      },
    ],
    scenario: 'different_agents',
  });

  console.log('Inserted 6 transactions, 2 commission breakdowns.');
  await mongoose.disconnect();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
