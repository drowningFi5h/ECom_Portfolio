import { getAvailableSizes, getWarehouseAddresses } from './actions';
import ManufacturerForm from './ManufacturerForm';

export const dynamic = 'force-dynamic';

export default async function ManufacturerPage() {
  const [sizes, addresses] = await Promise.all([
    getAvailableSizes(),
    getWarehouseAddresses(),
  ]);

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-8 space-y-8">

      <div>
        <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--amz-charcoal)' }}>
          Production entry
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--amz-charcoal-muted)' }}>
          Submit a batch record for admin review and rate update
        </p>
      </div>

      {sizes.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed py-16 text-center"
          style={{ borderColor: 'var(--amz-beige-border)', background: 'var(--amz-beige)' }}>
          <p className="text-sm font-medium" style={{ color: 'var(--amz-charcoal-soft)' }}>
            No box sizes found in inventory — sync inventory first
          </p>
        </div>
      ) : (
        <ManufacturerForm sizes={sizes} savedAddresses={addresses} />
      )}

    </div>
  );
}
