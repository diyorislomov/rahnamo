-- The prepaid thread endpoint stores 'card' for manually confirmed bank payments.
-- Keep existing providers valid while accepting the method already used by that endpoint.
ALTER TABLE bookings DROP CONSTRAINT bookings_payment_method_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_payment_method_check
  CHECK (payment_method IN ('payme','click','uzum','card'));
