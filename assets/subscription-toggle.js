if (!customElements.get('subscription-toggle')) {
  customElements.define(
    'subscription-toggle',
    class SubscriptionToggle extends HTMLElement {
      connectedCallback() {
        this._formId = this.dataset.formId;
        this._cadenceEl = this.querySelector('[data-subscription-cadence]');
        this._discountEl = this.querySelector('[data-subscription-discount]');
        this._purchaseOptionInputs = this.querySelectorAll('[data-subscription-purchase-option-input]');

        this._purchaseOptionInputs.forEach((input) => {
          input.addEventListener('change', this._onPurchaseOptionChange.bind(this));
        });

        this._applyState();
      }

      _isSubscribeSelected() {
        const sub = this.querySelector('[data-subscription-purchase-option-input][value="subscribe"]');
        return sub ? sub.checked : false;
      }

      _getCheckedCadenceId() {
        const checked = this.querySelector('[data-subscription-cadence-input]:checked');
        return checked ? checked.value : '';
      }

      _getSellingPlanInput() {
        const form = document.getElementById(this._formId);
        return form ? form.querySelector('[data-subscription-selling-plan-input]') : null;
      }

      _applyState() {
        const isSubscribe = this._isSubscribeSelected();

        if (this._cadenceEl) this._cadenceEl.hidden = !isSubscribe;
        if (this._discountEl) this._discountEl.hidden = !isSubscribe;

        const spInput = this._getSellingPlanInput();
        if (spInput) {
          spInput.value = isSubscribe ? this._getCheckedCadenceId() : '';
        }
      }

      _onPurchaseOptionChange() {
        this._applyState();
      }
    }
  );
}
